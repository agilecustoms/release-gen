import { exec } from 'node:child_process'
import * as path from 'node:path'
import * as util from 'node:util'
import * as core from '@actions/core'

const run = async () => {
  // Install Dependencies
  if (process.env.CI) {
    const execAsync = util.promisify(exec)
    const { stdout, stderr } = await execAsync('npm --loglevel error ci --only=prod', {
      cwd: path.resolve(__dirname)
    })
    console.log(stdout)
    if (stderr) {
      return Promise.reject(stderr)
    }
  }

  const { release } = await import('./release.js')
  await release()
}

run().catch(core.setFailed)
