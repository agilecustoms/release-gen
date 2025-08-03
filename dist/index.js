import * as fs from 'node:fs/promises';
import path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import { exec as execAsync } from './utils.js';
const distDir = path.dirname(fileURLToPath(import.meta.url));
const packageJsonDir = path.dirname(distDir);
export async function exec(command, error, cwd = packageJsonDir) {
    const { stdout, stderr } = await execAsync(command, { cwd });
    console.log(stdout);
    if (stderr) {
        console.error(error);
        console.error(stderr);
        process.exit(1);
    }
    return stdout;
}
await exec('npm --loglevel error ci --only=prod', 'Error during npm ci - packages installed dynamically at runtime');
const core = await import('@actions/core');
function getInput(name) {
    return core.getInput(name, { required: false });
}
const changelogFile = getInput('changelog_file');
const changelogTitle = getInput('changelog_title');
const defaultMinor = getInput('default_minor') === 'true';
const npmExtraDeps = getInput('npm_extra_deps');
const releaseBranches = getInput('release_branches');
const releasePlugins = getInput('release_plugins');
const tagFormat = getInput('tag_format');
if (npmExtraDeps) {
    const extras = npmExtraDeps.replace(/['"]/g, '').replace(/[\n\r]/g, ' ');
    await exec(`npm install ${extras}`, `Error during installing extra npm dependencies ${extras}`);
}
const cwd = process.env.GITHUB_WORKSPACE;
const options = {
    changelogFile,
    changelogTitle,
    cwd,
    defaultMinor,
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
    const message = 'Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)';
    console.error(message);
    core.setFailed(message);
    process.exit(1);
}
const notesFilePath = '/tmp/release-gen-notes';
await fs.writeFile(notesFilePath, result.notes, 'utf8');
core.setOutput('channel', result.channel);
core.setOutput('git_tags', result.gitTags.join(' '));
core.setOutput('notes_file', notesFilePath);
core.setOutput('prerelease', result.prerelease);
core.setOutput('tags', result.tags.join(' '));
core.setOutput('version', result.version);
