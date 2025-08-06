import path from 'node:path'
import * as process from 'node:process'
import { fileURLToPath } from 'node:url'
import { type ReleaseDetails, ReleaseError, type ReleaseOptions } from './model.js'
import { exec as execAsync } from './utils.js'

const distDir = path.dirname(fileURLToPath(import.meta.url)) // /home/runner/work/_actions/agilecustoms/release-gen/main/dist
const packageJsonDir = path.dirname(distDir)

export async function exec(command: string, error: string, cwd: string = packageJsonDir): Promise<string> {
  const { stdout, stderr } = await execAsync(command, { cwd })
  console.log(stdout)
  if (stderr) {
    console.error(error)
    console.error(stderr)
    process.exit(1)
  }
  return stdout
}

await exec('npm --loglevel error ci --only=prod', 'Error during npm ci - packages installed dynamically at runtime')

const core = await import('@actions/core')
function getInput(name: string): string {
  return core.getInput(name, { required: false })
}
const changelogFile: string = getInput('changelog_file')
const changelogTitle: string = getInput('changelog_title')
const notesTmpFile: string = getInput('notes_tmp_file')
const npmExtraDeps: string = getInput('npm_extra_deps')
const releaseBranches: string = getInput('release_branches')
const releasePlugins: string = getInput('release_plugins')
const tagFormat: string = getInput('tag_format')
const versionBump: string = getInput('version_bump')

if (npmExtraDeps) {
  const extras = npmExtraDeps.replace(/['"]/g, '').replace(/[\n\r]/g, ' ')
  await exec(`npm install ${extras}`, `Error during installing extra npm dependencies ${extras}`)
}

// cwd is /home/runner/work/_actions/agilecustoms/release-gen/main/dist
// need to be '/home/runner/work/{repo}/{repo}', like '/home/runner/work/release/release'
const cwd = process.env.GITHUB_WORKSPACE!

const options: ReleaseOptions = {
  changelogFile,
  changelogTitle,
  cwd,
  notesTmpFile,
  releaseBranches,
  releasePlugins,
  tagFormat,
  versionBump
}

const { SemanticReleaseAdapter } = await import('./service/SemanticReleaseAdapter.js')
const { ChangelogGenerator } = await import('./service/ChangelogGenerator.js')
const { ReleaseProcessor } = await import('./service/ReleaseProcessor.js')
const { GitClient } = await import('./service/GitClient.js')

const semanticReleaseAdapter = new SemanticReleaseAdapter()
const changelogGenerator = new ChangelogGenerator()
const gitClient = new GitClient()
const releaseProcessor = new ReleaseProcessor(semanticReleaseAdapter, changelogGenerator, gitClient)

let result: false | ReleaseDetails
try {
  result = await releaseProcessor.process(options)
} catch (e) {
  if (e instanceof ReleaseError) {
    const message = (e as Error).message
    console.error(message)
    core.setFailed(message)
  } else {
    console.error('An unexpected error occurred during the release process:', e)
    core.setFailed('An unexpected error occurred during the release process. Please check the logs for more details.')
  }
  process.exit(1)
}

core.setOutput('channel', result.channel) // the empty string is not printed, so no need to || ''
core.setOutput('git_tags', result.gitTags.join(' '))
core.setOutput('notes_tmp_file', result.notesTmpFile)
core.setOutput('prerelease', result.prerelease)
core.setOutput('tags', result.tags.join(' '))
core.setOutput('version', result.version)
