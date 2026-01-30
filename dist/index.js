import path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import { ReleaseError } from './model.js';
import { exec as execAsync } from './utils.js';
const distDir = path.dirname(fileURLToPath(import.meta.url));
const packageJsonDir = path.dirname(distDir);
async function exec(command, error) {
    const { stdout, stderr } = await execAsync(command, { cwd: packageJsonDir });
    console.log(stdout);
    if (stderr) {
        console.error(error);
        console.error(stderr);
        process.exit(1);
    }
    return stdout;
}
console.log('Node version: ' + process.version);
await exec('npm ci --only=prod --loglevel=error --no-audit --no-fund --no-progress', 'Error during npm ci - packages installed dynamically at runtime');
const core = await import('@actions/core');
function getInput(name) {
    return core.getInput(name, { required: false });
}
const changelogFile = getInput('changelog_file');
const changelogTitle = getInput('changelog_title');
const floatingTags = getInput('floating_tags') !== 'false';
const notesTmpFile = getInput('notes_tmp_file');
const npmExtraDeps = getInput('npm_extra_deps');
const releaseBranches = getInput('release_branches');
const releaseChannel = getInput('release_channel') === 'false' ? false : getInput('release_channel');
const releasePlugins = getInput('release_plugins');
const tagFormat = getInput('tag_format');
const version = getInput('version');
const versionBump = getInput('version_bump');
if (npmExtraDeps) {
    const extras = npmExtraDeps.replace(/['"]/g, '').replace(/[\n\r]/g, ' ');
    await exec(`npm install ${extras} --loglevel=error --no-audit --no-fund --no-progress --no-save`, `Error during installing extra npm dependencies ${extras}`);
}
const cwd = process.env.GITHUB_WORKSPACE;
const options = {
    changelogFile,
    changelogTitle,
    cwd,
    floatingTags,
    notesTmpFile,
    releaseBranches,
    releaseChannel,
    releasePlugins,
    tagFormat,
    version,
    versionBump
};
const { SemanticReleaseAdapter } = await import('./service/SemanticReleaseAdapter.js');
const { ChangelogGenerator } = await import('./service/ChangelogGenerator.js');
const { ReleaseProcessor } = await import('./service/ReleaseProcessor.js');
const { GitClient } = await import('./service/GitClient.js');
const semanticReleaseAdapter = new SemanticReleaseAdapter();
const changelogGenerator = new ChangelogGenerator();
const gitClient = new GitClient();
const releaseProcessor = new ReleaseProcessor(semanticReleaseAdapter, changelogGenerator, gitClient);
let result;
try {
    result = await releaseProcessor.process(options);
}
catch (e) {
    if (e instanceof ReleaseError) {
        const message = e.message;
        core.setFailed(message);
    }
    else {
        console.error('An unexpected error occurred during the release process: ', e);
        core.setFailed('An unexpected error occurred during the release process. Please check the logs for more details');
    }
    process.exit(1);
}
core.setOutput('channel', result.channel);
core.setOutput('git_tags', result.gitTags.join(' '));
core.setOutput('notes_tmp_file', result.notesTmpFile);
core.setOutput('prerelease', result.prerelease);
core.setOutput('tags', result.tags.join(' '));
core.setOutput('version', result.version);
