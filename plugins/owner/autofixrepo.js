import { exec as _exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { db } from '../../database/db.js'

const exec = promisify(_exec)

function short(text, limit = 1500) {
  if (!text) return ''
  if (text.length <= limit) return text
  return text.slice(0, limit) + '\n\n...[truncated]'
}

function listProjectFiles(rootDir, extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx'])) {
  const out = []
  const walk = (current) => {
    if (!fs.existsSync(current)) return
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.next', 'dist', 'build', 'coverage'].includes(entry.name)) continue
        walk(full)
      } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
        out.push(full)
      }
    }
  }
  walk(rootDir)
  return out
}

async function runNodeCheck(filePath) {
  try {
    const { stdout, stderr } = await exec(`node --check "${filePath}"`, { timeout: 30000, maxBuffer: 1024 * 1024 })
    return { ok: true, file: filePath, stdout: stdout || '', stderr: stderr || '' }
  } catch (e) {
    return { ok: false, file: filePath, stdout: e.stdout || '', stderr: e.stderr || e.message || '' }
  }
}

export default {
  name: ['autofixrepo', 'fixrepo'],
  description: 'Revisa el repositorio, detecta errores y los arregla automáticamente. Owner-only.',
  category: 'owner',
  ownerOnly: true,

  async run({ reply, sender }) {
    try {
      const senderJid = sender
      if (!db.hasRole(senderJid, 'owner')) {
        return await reply({ text: '❌ Acceso denegado. Solo owners pueden usar este comando.' })
      }

      await reply({ text: '🔎 Iniciando revisión automática del repositorio. Detectaré errores de sintaxis y aplicaré correcciones automáticas...' })

      const cwd = process.cwd()

      try {
        await exec('git rev-parse --is-inside-work-tree', { cwd })
      } catch (e) {
        return await reply({ text: '❌ Este servicio no parece estar dentro de un repositorio git.' })
      }

      const projectFiles = listProjectFiles(cwd)
      const syntaxErrors = []
      const checked = []

      for (const file of projectFiles) {
        const result = await runNodeCheck(file)
        checked.push(result)
        if (!result.ok) {
          syntaxErrors.push({
            file: path.relative(cwd, file),
            error: short(result.stderr || result.stdout || 'Error desconocido')
          })
        }
      }

      let summary = '✅ Revisión automática finalizada.\n\n'

      if (syntaxErrors.length === 0) {
        summary += 'No se detectaron errores de sintaxis en el proyecto.\n\n'
      } else {
        summary += `Se detectaron ${syntaxErrors.length} error(es):\n`
        for (const item of syntaxErrors) {
          summary += `- ${item.file}\n  → ${item.error.split('\n')[0]}\n`
        }
        summary += '\n'
      }

      const fixCommand = `npx --yes eslint . --ext .js,.cjs,.mjs,.ts,.tsx --fix && npx --yes prettier --write "**/*.{js,ts,jsx,tsx,json,css,md}"`

      try {
        const { stdout, stderr } = await exec(fixCommand, {
          cwd,
          timeout: 1000 * 60 * 5,
          maxBuffer: 1024 * 1024 * 20
        })
        summary += '🔧 Corrección automática ejecutada.\n'
        const fixOut = (stdout || stderr || '').trim()
        if (fixOut) {
          summary += `  → ${fixOut.split('\n').slice(0, 5).join(' | ')}\n`
        }
      } catch (e) {
        const fixOut = (e.stderr || e.stdout || e.message || '').trim()
        summary += '⚠️ La corrección automática no pudo completarse por completo.\n'
        if (fixOut) summary += `  → ${fixOut.split('\n')[0]}\n`
      }

      // Re-check after fixes
      const afterFix = []
      for (const file of projectFiles) {
        const result = await runNodeCheck(file)
        afterFix.push(result)
      }

      const remaining = afterFix.filter(r => !r.ok)
      summary += '\nVerificación final:\n'
      if (remaining.length === 0) {
        summary += '✅ Todos los archivos verificados quedaron sin errores de sintaxis.\n'
      } else {
        summary += `⚠️ Aún quedan ${remaining.length} error(es):\n`
        for (const item of remaining) {
          summary += `- ${path.relative(cwd, item.file)}\n  → ${(item.stderr || item.stdout || 'Error desconocido').split('\n')[0]}\n`
        }
      }

      await reply({ text: summary })

    } catch (e) {
      console.error('[autofixrepo]', e)
      await reply({ text: `❌ Error durante la revisión automática: ${e.message || e}` })
    }
  }
}
