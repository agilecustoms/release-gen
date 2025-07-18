import { exec } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as util from 'node:util'
import type { Release, ReleaseOptions } from './model.js'

const distDir = path.dirname(fileURLToPath(import.meta.url)) // /home/runner/work/_actions/agilecustoms/release-gen/main/dist
const packageJsonDir = path.dirname(distDir)
const execAsync = util.promisify(exec)
let { stdout, stderr } = await execAsync('npm --loglevel error ci --only=prod', {
  cwd: packageJsonDir
})

console.log(stdout)
if (stderr) {
  console.error('Error during npm ci - packages installed dynamically at runtime')
  console.error(stderr)
  process.exit(1)
}

const core = await import('@actions/core')
function getInput(name: string): string {
  return core.getInput(name, { required: false, trimWhitespace: true })
}
const changelogFile: string = getInput('changelog_file')
const changelogTitle: string = getInput('changelog_title')
const npmExtraDeps: string = getInput('npm_extra_deps')
const releaseBranches: string = getInput('release_branches')
const releasePlugins: string = getInput('release_plugins')
const tagFormat: string = getInput('tag_format')

if (npmExtraDeps) {
  const extras = npmExtraDeps.replace(/['"]/g, '').replace(/[\n\r]/g, ' ');
  ({ stdout, stderr } = await execAsync(`npm install ${extras}`, {
    cwd: packageJsonDir
  }))
  console.log(stdout)
  if (stderr) {
    console.error(`Error during installing extra npm dependencies ${extras}`)
    console.error(stderr)
    process.exit(1)
  }
}

const options: ReleaseOptions = {
  changelogFile,
  changelogTitle,
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

let result: Release | false
try {
  result = await releaseProcessor.process(options)
} catch (e) {
  core.setFailed(e as Error)
  process.exit(1)
}

if (!result) {
  core.setFailed('No new release found')
  process.exit(1)
}

const notesFilePath = '/tmp/release-gen-notes'
await fs.writeFile(notesFilePath, result.notes, 'utf8')

core.setOutput('next_version', result.nextVersion)
core.setOutput('notes_file', notesFilePath)
