import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const args = process.argv.slice(2)
const reload = args.includes('--reload')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const cwd = path.resolve(__dirname, '..', 'backend_dtcloud')

const env = {
  ...process.env,
  RELOAD: reload ? '1' : '0',
}

const child = spawn('python', ['-m', 'digital_labor.run'], {
  cwd,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})

