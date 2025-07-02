import { exec } from 'node:child_process';
import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as util from 'node:util';
const distDir = path.dirname(fileURLToPath(import.meta.url));
const packageJsonDir = path.dirname(distDir);
const execAsync = util.promisify(exec);
const { stdout, stderr } = await execAsync('npm --loglevel error ci --only=prod', {
    cwd: packageJsonDir
});
console.log(stdout);
if (stderr && !stderr.startsWith('Debugger listening on')) {
    console.error('Error during npm ci - packages installed dynamically at runtime');
    console.error(stderr);
    process.exit(1);
}
const core = await import('@actions/core');
const { release } = await import('./release.js');
let result;
try {
    result = await release();
}
catch (e) {
    core.setFailed(e);
    process.exit(1);
}
if (!result) {
    console.log('No new release found');
    process.exit(1);
}
core.setOutput('next_version', result.nextVersion);
core.setOutput('notes', result.notes);
