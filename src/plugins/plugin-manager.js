import { mkdir, readdir, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PluginExecutionError } from '../utils/errors.js';

const PERMISSIONS = new Set([
  'user',
  'admin',
  'bot-admin',
  'owner',
]);

function isPluginFile(name) {
  return typeof name === 'string' && name.endsWith('.plugin.js');
}

function normalizeCommandName(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const command = value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/^[./!]+/u, '');

  return /^[\p{L}\p{N}_:-]{1,64}$/u.test(command)
    ? command
    : null;
}

function normalizeCommands(candidate) {
  const values = [
    candidate.command,
    candidate.commands,
    candidate.aliases,
  ].flatMap((value) => Array.isArray(value) ? value : [value]);

  return [...new Set(values
    .map((value) => normalizeCommandName(value))
    .filter(Boolean))];
}

function normalizePermissions(value) {
  const values = value === undefined
    ? []
    : Array.isArray(value)
      ? value
      : [value];

  const permissions = [...new Set(values.map((permission) => (
    typeof permission === 'string'
      ? permission.trim().toLocaleLowerCase('en-US')
      : ''
  )))];

  for (const permission of permissions) {
    if (!PERMISSIONS.has(permission)) {
      throw new Error(`Unknown plugin permission: ${permission}`);
    }
  }

  return permissions;
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

  if (
    candidate.match !== undefined
    && typeof candidate.match !== 'function'
    && typeof candidate.match !== 'string'
    && !(candidate.match instanceof RegExp)
  ) {
    throw new Error(
      `Plugin ${filePath} match must be a function, string or RegExp`,
    );
  }

  const commands = normalizeCommands(candidate);
  if (commands.length === 0 && candidate.match === undefined) {
    throw new Error(
      `Plugin ${filePath} requires command(s) or match`,
    );
  }

  const priority = candidate.priority ?? 100;
  if (!Number.isSafeInteger(priority)) {
    throw new Error(`Plugin ${filePath} priority must be an integer`);
  }

  return Object.freeze({
    ...candidate,
    priority,
    commands: Object.freeze(commands),
    permissions: Object.freeze(normalizePermissions(candidate.permissions)),
    silentDenied: candidate.silentDenied === true,
    filePath,
  });
}

async function matches(plugin, context) {
  const text = context?.message?.text ?? '';
  const command = context?.message?.command;

  if (plugin.commands.length > 0) {
    if (plugin.commands.includes(command)) {
      return true;
    }

    if (plugin.match === undefined) {
      return false;
    }
  }

  if (typeof plugin.match === 'function') {
    return Boolean(await plugin.match(context));
  }

  if (typeof plugin.match === 'string') {
    return text === plugin.match;
  }

  if (plugin.match instanceof RegExp) {
    plugin.match.lastIndex = 0;
    return plugin.match.test(text);
  }

  return false;
}

function permissionSatisfied(permission, permissions = {}) {
  switch (permission) {
    case 'user':
      return permissions.user === true;
    case 'admin':
      return permissions.admin === true || permissions.owner === true;
    case 'bot-admin':
      return permissions.botAdmin === true;
    case 'owner':
      return permissions.owner === true;
    default:
      return false;
  }
}

function hasRequiredPermissions(required, permissions) {
  return required.every((permission) => permissionSatisfied(permission, permissions));
}

function permissionDenialText(required) {
  if (required.includes('owner')) {
    return 'Este comando requiere permisos de owner.';
  }

  if (required.includes('bot-admin')) {
    return 'Necesito ser administrador del grupo para ejecutar este comando.';
  }

  if (required.includes('admin')) {
    return 'Este comando requiere permisos de administrador.';
  }

  return 'No tienes permisos para ejecutar este comando.';
}

function pluginError(error, plugin, context, phase) {
  return error instanceof PluginExecutionError
    ? error
    : new PluginExecutionError(`Plugin ${phase} failed`, {
        pluginName: plugin.name,
        messageId: context?.message?.id,
        jid: context?.message?.remoteJid,
        cause: error,
      });
}

/**
 * Dynamic ESM plugin registry with hot reload, command matching and isolated
 * permission/error boundaries.
 */
export class PluginManager {
  constructor({
    directory,
    logger,
    watchEnabled = true,
    reloadDebounceMs = 100,
  } = {}) {
    if (typeof directory !== 'string' || directory.trim() === '') {
      throw new TypeError(
        'PluginManager directory must be a non-empty path',
      );
    }

    if (!logger || typeof logger.error !== 'function') {
      throw new TypeError(
        'PluginManager requires an error logger method',
      );
    }

    if (!Number.isSafeInteger(reloadDebounceMs) || reloadDebounceMs < 0) {
      throw new RangeError(
        'reloadDebounceMs must be a non-negative integer',
      );
    }

    this.directory = resolve(directory);
    this.logger = logger;
    this.watchEnabled = watchEnabled;
    this.reloadDebounceMs = reloadDebounceMs;
    this.plugins = new Map();
    this.watcher = null;
    this.reloadTimers = new Map();
    this.moduleGeneration = 0;
    this.closed = false;
  }

  async loadAll() {
    if (this.closed) {
      throw new Error('PluginManager is closed');
    }

    await mkdir(this.directory, { recursive: true });

    const entries = await readdir(this.directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && isPluginFile(entry.name))
      .map((entry) => resolve(this.directory, entry.name));
    const fileSet = new Set(files);

    for (const filePath of files) {
      try {
        await this.#load(filePath);
      } catch (error) {
        this.logger.error({
          err: error,
          plugin: basename(filePath),
        }, 'Plugin rejected during initial load');
      }
    }

    for (const plugin of this.plugins.values()) {
      if (!fileSet.has(plugin.filePath)) {
        this.plugins.delete(plugin.name);
      }
    }

    this.#sort();

    if (this.watchEnabled) {
      this.#startWatcher();
    }
  }

  #startWatcher() {
    this.watcher?.close();

    this.watcher = watch(
      this.directory,
      {
        persistent: false,
        encoding: 'utf8',
      },
      (eventType, filename) => {
        if (this.closed || !filename) {
          return;
        }

        const name = filename.toString();
        if (!isPluginFile(name)) {
          return;
        }

        const filePath = resolve(this.directory, name);
        const previousTimer = this.reloadTimers.get(filePath);

        if (previousTimer) {
          clearTimeout(previousTimer);
        }

        const timer = setTimeout(() => {
          this.reloadTimers.delete(filePath);
          void this.#reload(filePath, eventType);
        }, this.reloadDebounceMs);

        timer.unref?.();
        this.reloadTimers.set(filePath, timer);
      },
    );

    this.watcher.on('error', (error) => {
      if (!this.closed) {
        this.logger.error({
          err: error,
          directory: this.directory,
        }, 'Plugin watcher failed');
      }
    });
  }

  async #reload(filePath, eventType) {
    if (this.closed) {
      return;
    }

    try {
      await stat(filePath);
      await this.#load(filePath);
      this.#sort();

      this.logger.info?.({
        plugin: basename(filePath),
        eventType,
      }, 'Plugin hot-reloaded');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        this.#unloadFile(filePath);
        return;
      }

      this.logger.error({
        err: error,
        plugin: basename(filePath),
      }, 'Plugin reload rejected; previous version kept');
    }
  }

  async #load(filePath) {
    const fileStat = await stat(filePath);
    const generation = ++this.moduleGeneration;
    const fileUrl = `${pathToFileURL(filePath).href}?v=${fileStat.mtimeMs}-${generation}`;
    const module = await import(fileUrl);
    const candidate = validatePlugin(module.default, filePath);
    const previousByName = this.plugins.get(candidate.name);

    if (previousByName && previousByName.filePath !== filePath) {
      throw new Error(`Duplicate plugin name ${candidate.name}`);
    }

    const previousByFile = [...this.plugins.values()].find(
      (plugin) => plugin.filePath === filePath,
    );

    if (previousByFile && previousByFile.name !== candidate.name) {
      this.plugins.delete(previousByFile.name);
    }

    this.plugins.set(candidate.name, candidate);
  }

  #unloadFile(filePath) {
    const existing = [...this.plugins.values()].find(
      (plugin) => plugin.filePath === filePath,
    );

    if (!existing) {
      return;
    }

    this.plugins.delete(existing.name);
    this.#sort();

    this.logger.info?.({
      plugin: basename(filePath),
    }, 'Plugin unloaded');
  }

  #sort() {
    const sorted = [...this.plugins.values()].sort(
      (left, right) => left.priority - right.priority
        || left.name.localeCompare(right.name),
    );

    this.plugins = new Map(
      sorted.map((plugin) => [plugin.name, plugin]),
    );
  }

  async dispatch(context, diagnostics) {
    if (!context?.message) {
      throw new TypeError('Plugin dispatch requires a message context');
    }

    for (const plugin of this.plugins.values()) {
      let matched = false;

      try {
        matched = await matches(plugin, context);
      } catch (error) {
        const normalized = pluginError(error, plugin, context, 'matcher');

        diagnostics?.pluginFailure?.({
          error: normalized,
          pluginName: plugin.name,
          messageId: context.message.id,
          jid: context.message.remoteJid,
        });

        continue;
      }

      if (!matched) {
        continue;
      }

      if (!hasRequiredPermissions(plugin.permissions, context.permissions)) {
        if (!plugin.silentDenied && typeof context.reply === 'function') {
          await context.reply({
            text: plugin.deniedMessage ?? permissionDenialText(plugin.permissions),
          }).catch((error) => {
            diagnostics?.pluginFailure?.({
              error: pluginError(error, plugin, context, 'permission-reply'),
              pluginName: `${plugin.name}:permission-reply`,
              messageId: context.message.id,
              jid: context.message.remoteJid,
            });
          });
        }

        return {
          handled: true,
          denied: true,
          plugin: plugin.name,
        };
      }

      try {
        const result = await plugin.execute(context);

        if (result?.handled !== false) {
          return {
            handled: true,
            plugin: plugin.name,
          };
        }
      } catch (error) {
        const normalized = pluginError(error, plugin, context, 'execution');

        diagnostics?.pluginFailure?.({
          error: normalized,
          pluginName: plugin.name,
          messageId: context.message.id,
          jid: context.message.remoteJid,
        });

        if (typeof context.reply === 'function') {
          await context.reply({
            text: 'No pude completar ese comando. El error quedó aislado y registrado.',
          }).catch((replyError) => {
            const replyFailure = pluginError(
              replyError,
              plugin,
              context,
              'error-reply',
            );

            diagnostics?.pluginFailure?.({
              error: replyFailure,
              pluginName: `${plugin.name}:error-reply`,
              messageId: context.message.id,
              jid: context.message.remoteJid,
            });
          });
        }

        return {
          handled: true,
          plugin: plugin.name,
          failed: true,
        };
      }
    }

    return {
      handled: false,
      plugin: null,
    };
  }

  list() {
    return [...this.plugins.values()].map((plugin) => ({
      name: plugin.name,
      priority: plugin.priority,
      commands: [...plugin.commands],
      permissions: [...plugin.permissions],
      filePath: plugin.filePath,
    }));
  }

  async close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.watcher?.close();

    for (const timer of this.reloadTimers.values()) {
      clearTimeout(timer);
    }

    this.reloadTimers.clear();
    this.plugins.clear();
  }
}

export {
  PERMISSIONS,
  hasRequiredPermissions,
  isPluginFile,
  normalizeCommandName,
  validatePlugin,
};
