import { mkdir, readdir, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function isPluginFile(name) {
  return name.endsWith('.plugin.js');
}

function validatePlugin(candidate, filePath) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`Plugin ${filePath} must export a default object`);
  }
  if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
    throw new Error(`Plugin ${filePath} requires a non-empty name`);
  }
  if (typeof candidate.execute !== 'function') {
    throw new Error(`Plugin ${filePath} requires an execute function`);
  }
  if (!(typeof candidate.match === 'function' || typeof candidate.match === 'string' || candidate.match instanceof RegExp)) {
    throw new Error(`Plugin ${filePath} requires match as function, string or RegExp`);
  }
  return Object.freeze({
    priority: Number.isSafeInteger(candidate.priority) ? candidate.priority : 100,
    ...candidate,
    filePath,
  });
}

function matches(plugin, context) {
  if (typeof plugin.match === 'function') {
    return plugin.match(context);
  }
  if (typeof plugin.match === 'string') {
    return context.message.text === plugin.match;
  }
  plugin.match.lastIndex = 0;
  return plugin.match.test(context.message.text);
}

export class PluginManager {
  constructor({ directory, logger, watchEnabled = true }) {
    this.directory = resolve(directory);
    this.logger = logger;
    this.watchEnabled = watchEnabled;
    this.plugins = new Map();
    this.watcher = null;
    this.reloadTimers = new Map();
    this.closed = false;
  }

  async loadAll() {
    await mkdir(this.directory, { recursive: true });
    const entries = await readdir(this.directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && isPluginFile(entry.name))
      .map((entry) => resolve(this.directory, entry.name));

    for (const filePath of files) {
      await this.#load(filePath);
    }

    this.#sort();
    if (this.watchEnabled) {
      this.#startWatcher();
    }
  }

  #startWatcher() {
    this.watcher?.close();
    this.watcher = watch(this.directory, { persistent: false }, (eventType, filename) => {
      if (this.closed || !filename) {
        return;
      }
      const name = filename.toString();
      if (!isPluginFile(name)) {
        return;
      }
      const filePath = resolve(this.directory, name);
      clearTimeout(this.reloadTimers.get(filePath));
      const timer = setTimeout(() => {
        this.reloadTimers.delete(filePath);
        void this.#reload(filePath, eventType);
      }, 100);
      timer.unref?.();
      this.reloadTimers.set(filePath, timer);
    });
    this.watcher.on('error', (error) => {
      this.logger.error({ err: error, directory: this.directory }, 'Plugin watcher failed');
    });
  }

  async #reload(filePath, eventType) {
    try {
      await stat(filePath);
      await this.#load(filePath);
      this.#sort();
      this.logger.info({ plugin: basename(filePath), eventType }, 'Plugin hot-reloaded');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        const existing = [...this.plugins.values()].find((plugin) => plugin.filePath === filePath);
        if (existing) {
          this.plugins.delete(existing.name);
          this.#sort();
          this.logger.info({ plugin: basename(filePath) }, 'Plugin unloaded');
        }
        return;
      }
      this.logger.error({ err: error, plugin: basename(filePath) }, 'Plugin reload rejected; previous version kept');
    }
  }

  async #load(filePath) {
    const fileUrl = `${pathToFileURL(filePath).href}?v=${Date.now()}`;
    const module = await import(fileUrl);
    const candidate = validatePlugin(module.default, filePath);
    const previous = this.plugins.get(candidate.name);
    if (previous && previous.filePath !== filePath) {
      throw new Error(`Duplicate plugin name ${candidate.name}`);
    }
    this.plugins.set(candidate.name, candidate);
  }

  #sort() {
    const sorted = [...this.plugins.values()].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    this.plugins = new Map(sorted.map((plugin) => [plugin.name, plugin]));
  }

  async dispatch(context, diagnostics) {
    for (const plugin of this.plugins.values()) {
      let matched = false;
      try {
        matched = await matches(plugin, context);
      } catch (error) {
        diagnostics.pluginFailure({ error, pluginName: plugin.name, messageId: context.message.id, jid: context.message.remoteJid });
        continue;
      }
      if (!matched) {
        continue;
      }

      try {
        const result = await plugin.execute(context);
        if (result?.handled !== false) {
          return { handled: true, plugin: plugin.name };
        }
      } catch (error) {
        diagnostics.pluginFailure({ error, pluginName: plugin.name, messageId: context.message.id, jid: context.message.remoteJid });
        await context.reply({ text: 'No pude completar ese comando. El error quedó aislado y registrado.' }).catch((replyError) => {
          diagnostics.pluginFailure({ error: replyError, pluginName: `${plugin.name}:error-reply`, messageId: context.message.id, jid: context.message.remoteJid });
        });
        return { handled: true, plugin: plugin.name, failed: true };
      }
    }

    return { handled: false, plugin: null };
  }

  list() {
    return [...this.plugins.values()].map(({ name, priority, filePath }) => ({ name, priority, filePath }));
  }

  async close() {
    this.closed = true;
    this.watcher?.close();
    for (const timer of this.reloadTimers.values()) {
      clearTimeout(timer);
    }
    this.reloadTimers.clear();
  }
}
