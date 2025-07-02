import { exec } from 'node:child_process'
import * as path from 'node:path'
import * as util from 'node:util'

if (process.env.CI) {
  const execAsync = util.promisify(exec)
  const { stdout, stderr } = await execAsync('npm --loglevel error ci --only=prod', {
    cwd: path.resolve(__dirname)
  })
  console.log(stdout)
  if (stderr) {
    console.error(stderr)
    process.exit(1);
  }
}

const core = await import('@actions/core');
const { release } = await import('./release.js')
await release().catch(core.setFailed)
