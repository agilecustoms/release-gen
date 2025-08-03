import { exec as execSync } from 'node:child_process';
import util from 'node:util';
const execAsync = util.promisify(execSync);
export async function exec(command, options = {}) {
    return execAsync(command, options);
}
