import { exec as execSync, type ExecOptions } from 'node:child_process'
import util from 'node:util'

const execAsync = util.promisify(execSync)

export async function exec(command: string, options: ExecOptions = {}): Promise<{ stdout: string, stderr: string }> {
  return execAsync(command, options)
}
