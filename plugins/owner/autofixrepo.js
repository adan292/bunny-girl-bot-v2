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

export default {
  name: ['autofixrepo', 'fixrepo'],
  description: 'Revisa el repositorio y aplica arreglos automáticos (eslint --fix, prettier --write). Owner-only.',
  category: 'owner',
  ownerOnly: true,

  async run({ reply, sender }) {
    try {
      const senderJid = sender
      if (!db.hasRole(senderJid, 'owner')) {
        return await reply({ text: '❌ Acceso denegado. Solo owners pueden usar este comando.' })
      }

      await reply({ text: '🔎 Iniciando revisión automática del repositorio. Esto puede tardar varios minutos...' })

      const cwd = process.cwd()

      // Ensure we're in a git repo
      try {
        await exec('git rev-parse --is-inside-work-tree', { cwd })
      } catch (e) {
        return await reply({ text: '❌ Este servicio no parece estar dentro de un repositorio git.' })
      }

      const stamp = Date.now()
      const branchName = `autofix/${stamp}`
      const result = { steps: [] }

      // create branch
      try {
        await exec(`git checkout -b ${branchName}`, { cwd })
        result.steps.push({ step: 'create_branch', ok: true, out: branchName })
      } catch (e) {
        // maybe branch exists or uncommitted changes: try to checkout -B
        try {
          await exec(`git checkout -B ${branchName}`, { cwd })
          result.steps.push({ step: 'create_branch_force', ok: true, out: branchName })
        } catch (err) {
          result.steps.push({ step: 'create_branch', ok: false, out: short(err.stderr || err.message) })
          return await reply({ text: `❌ No se pudo crear la rama ${branchName}.\n${short(err.stderr || err.message)}` })
        }
      }

      // Detect package.json
      const pkgPath = path.join(cwd, 'package.json')
      const hasPkg = fs.existsSync(pkgPath)

      // Run eslint --fix if available or via npx
      if (hasPkg) {
        let pkg
        try {
          pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        } catch {}

        // If eslint is declared or we can run via npx, attempt fix
        try {
          // try to run eslint --fix
          const eslintCmd = `npx --yes eslint . --ext .js,.cjs,.mjs,.ts,.tsx --fix`
          const { stdout, stderr } = await exec(eslintCmd, { cwd, maxBuffer: 1024 * 1024 * 10, timeout: 1000 * 60 * 3 })
          result.steps.push({ step: 'eslint_fix', ok: true, out: short(stdout || stderr) })
        } catch (e) {
          result.steps.push({ step: 'eslint_fix', ok: false, out: short(e.stderr || e.message) })
        }

        // try prettier
        try {
          const prettierCmd = `npx --yes prettier --write "**/*.{js,ts,jsx,tsx,json,css,md}"`
          const { stdout, stderr } = await exec(prettierCmd, { cwd, maxBuffer: 1024 * 1024 * 10, timeout: 1000 * 60 * 3 })
          result.steps.push({ step: 'prettier_write', ok: true, out: short(stdout || stderr) })
        } catch (e) {
          result.steps.push({ step: 'prettier_write', ok: false, out: short(e.stderr || e.message) })
        }

        // try npm audit fix (best-effort, non-blocking)
        try {
          const { stdout, stderr } = await exec('npm audit fix --no-fund --no-audit', { cwd, maxBuffer: 1024 * 1024 * 10, timeout: 1000 * 60 * 2 })
          result.steps.push({ step: 'npm_audit_fix', ok: true, out: short(stdout || stderr) })
        } catch (e) {
          result.steps.push({ step: 'npm_audit_fix', ok: false, out: short(e.stderr || e.message) })
        }
      } else {
        result.steps.push({ step: 'package_json', ok: false, out: 'package.json no encontrado, se omiten fixes de eslint/prettier' })
      }

      // Run tests if any
      if (hasPkg) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
          if (pkg.scripts && pkg.scripts.test) {
            try {
              const { stdout, stderr } = await exec('npm test --silent', { cwd, maxBuffer: 1024 * 1024 * 10, timeout: 1000 * 60 * 5 })
              result.steps.push({ step: 'npm_test', ok: true, out: short(stdout || stderr) })
            } catch (e) {
              result.steps.push({ step: 'npm_test', ok: false, out: short(e.stderr || e.message) })
            }
          } else {
            result.steps.push({ step: 'npm_test', ok: false, out: 'No hay script test en package.json' })
          }
        } catch {
          result.steps.push({ step: 'npm_test', ok: false, out: 'No se pudo leer package.json' })
        }
      }

      // Add and commit changes if any
      try {
        await exec('git add -A', { cwd })
        const { stdout: diffStd } = await exec('git diff --cached --name-only', { cwd })
        const changed = diffStd.trim().split('\n').filter(Boolean)
        if (changed.length === 0) {
          result.steps.push({ step: 'git_changes', ok: true, out: 'No hay cambios para commitear' })
          // checkout back to previous branch? leave on autofix branch
        } else {
          const commitMsg = `chore(autofix): cambios automáticos by bot ${new Date().toISOString()}`
          try {
            await exec(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd })
            result.steps.push({ step: 'git_commit', ok: true, out: `Committed ${changed.length} files` })
          } catch (e) {
            result.steps.push({ step: 'git_commit', ok: false, out: short(e.stderr || e.message) })
          }
        }
      } catch (e) {
        result.steps.push({ step: 'git_add', ok: false, out: short(e.stderr || e.message) })
      }

      // Prepare summary
      let summary = '✅ Revisión automática finalizada. Resumen:\n\n'
      for (const s of result.steps) {
        summary += `- ${s.step}: ${s.ok ? 'OK' : 'FAIL'}\n`
        if (s.out) summary += `  → ${s.out.split('\n')[0]}\n`
      }

      // If the summary is too long, send as file
      if (summary.length > 1500) {
        try {
          const tmp = path.join(process.cwd(), `autofix-report-${Date.now()}.txt`)
          fs.writeFileSync(tmp, JSON.stringify(result, null, 2))
          await reply({ text: '✅ Revisión finalizada. He creado un reporte con los detalles.', file: tmp })
          try { fs.unlinkSync(tmp) } catch {}
          return
        } catch (e) {
          // fallthrough
        }
      }

      await reply({ text: summary })

    } catch (e) {
      console.error('[autofixrepo]', e)
      await reply({ text: `❌ Error durante la revisión automática: ${e.message || e}` })
    }
  }
}
