import type { ExecSyncOptions } from 'child_process'
import fs from 'node:fs'
import { exec } from '../utils.js'

export class GitClient {
  public async commit(type: string): Promise<void> {
    const options: ExecSyncOptions = { stdio: 'inherit' }
    await fs.promises.writeFile(`./release-gen`, '')
    await exec('git add ./release-gen', options)
    await exec(`git commit -m "${type}: synthetic"`, options)
  }

  public async revert(): Promise<void> {
    const options: ExecSyncOptions = { stdio: 'inherit' }
    await exec('git reset --hard HEAD~1', options)
  }
}
