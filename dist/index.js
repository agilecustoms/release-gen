import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as util from 'node:util';
const distDir = path.dirname(fileURLToPath(import.meta.url));
const packageJsonDir = path.dirname(distDir);
const execAsync = util.promisify(exec);
let { stdout, stderr } = await execAsync('npm --loglevel error ci --only=prod', {
    cwd: packageJsonDir
});
console.log(stdout);
if (stderr) {
    console.error('Error during npm ci - packages installed dynamically at runtime');
    console.error(stderr);
    process.exit(1);
}
const core = await import('@actions/core');
function getInput(name) {
    return core.getInput(name, { required: false, trimWhitespace: true });
}
const changelogFile = getInput('changelog_file');
const changelogTitle = getInput('changelog_title');
const npmExtraDeps = getInput('npm_extra_deps');
const releaseBranches = getInput('release_branches');
const releasePlugins = getInput('release_plugins');
const tagFormat = getInput('tag_format');
if (npmExtraDeps) {
    const extras = npmExtraDeps.replace(/['"]/g, '').replace(/[\n\r]/g, ' ');
    ({ stdout, stderr } = await execAsync(`npm install ${extras}`, {
        cwd: packageJsonDir
    }));
    console.log(stdout);
    if (stderr) {
        console.error(`Error during installing extra npm dependencies ${extras}`);
        console.error(stderr);
        process.exit(1);
    }
}
const options = {
    changelogFile,
    changelogTitle,
    releaseBranches,
    releasePlugins,
    tagFormat
};
const { SemanticReleaseAdapter } = await import('./service/SemanticReleaseAdapter.js');
const { ChangelogGenerator } = await import('./service/ChangelogGenerator.js');
const { ReleaseProcessor } = await import('./service/ReleaseProcessor.js');
const semanticReleaseAdapter = new SemanticReleaseAdapter();
const changelogGenerator = new ChangelogGenerator();
const releaseProcessor = new ReleaseProcessor(semanticReleaseAdapter, changelogGenerator);
let result;
try {
    result = await releaseProcessor.process(options);
}
catch (e) {
    if (e instanceof Error) {
        if ('code' in e && e.code === 'MODULE_NOT_FOUND') {
            core.setFailed(`You're using non default preset, please specify corresponding npm package in npm-extra-deps input. Details: ${e.message}`);
        }
        else {
            core.setFailed(e);
        }
    }
    else {
        core.setFailed(String(e));
    }
    process.exit(1);
}
if (!result) {
    core.setFailed('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)');
    process.exit(1);
}
const notesFilePath = '/tmp/release-gen-notes';
await fs.writeFile(notesFilePath, result.notes, 'utf8');
core.setOutput('next_version', result.nextVersion);
core.setOutput('notes_file', notesFilePath);
