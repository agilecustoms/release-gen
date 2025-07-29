import { exec as execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as util from 'node:util'
import type { ReleaseOptions, TheNextRelease } from './model.js'

const distDir = path.dirname(fileURLToPath(import.meta.url)) // /home/runner/work/_actions/agilecustoms/release-gen/main/dist
const packageJsonDir = path.dirname(distDir)

const execAsync = util.promisify(execSync)
async function exec(command: string, error: string, cwd: string = packageJsonDir): Promise<string> {
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
const npmExtraDeps: string = getInput('npm_extra_deps')
const releaseBranches: string = getInput('release_branches')
const releasePlugins: string = getInput('release_plugins')
const tagFormat: string = getInput('tag_format')

if (npmExtraDeps) {
  const extras = npmExtraDeps.replace(/['"]/g, '').replace(/[\n\r]/g, ' ')
  await exec(`npm install ${extras}`, `Error during installing extra npm dependencies ${extras}`)
}

// cwd is /home/runner/work/_actions/agilecustoms/release-gen/main/dist
// need to be '/home/runner/work/{repo}/{repo}', like '/home/runner/work/release/release'
const cwd = process.env.GITHUB_WORKSPACE!

const branchName = await exec('git rev-parse --abbrev-ref HEAD', 'Error during getting current branch name', cwd)

const options: ReleaseOptions = {
  branchName: branchName.trim(),
  changelogFile,
  changelogTitle,
  cwd,
  releaseBranches,
  releasePlugins,
  tagFormat
}

const { SemanticReleaseAdapter } = await import('./service/SemanticReleaseAdapter.js')
const { ChangelogGenerator } = await import('./service/ChangelogGenerator.js')
const { ReleaseProcessor } = await import('./service/ReleaseProcessor.js')

const semanticReleaseAdapter = new SemanticReleaseAdapter()
const changelogGenerator = new ChangelogGenerator()
const releaseProcessor = new ReleaseProcessor(semanticReleaseAdapter, changelogGenerator)

let result: false | TheNextRelease
try {
  result = await releaseProcessor.process(options)
} catch (e) {
  if (e instanceof Error) {
    if ('code' in e && e.code === 'MODULE_NOT_FOUND') {
      core.setFailed(`You're using non default preset, please specify corresponding npm package in npm-extra-deps input. Details: ${e.message}`)
    } else {
      core.setFailed(e)
    }
  } else {
    core.setFailed(String(e))
  }
  process.exit(1)
}

// if no semantic commits that increase version, then semantic-release returns empty result (no error!)
if (!result) {
  const message = 'Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)'
  console.error(message)
  core.setFailed(message)
  process.exit(1)
}

const notesFilePath = '/tmp/release-gen-notes'
await fs.writeFile(notesFilePath, result.notes!, 'utf8')

core.setOutput('channel', result.channel)
core.setOutput('git_tag', result.gitTag)
core.setOutput('notes_file', notesFilePath)
core.setOutput('prerelease', result.prerelease)
