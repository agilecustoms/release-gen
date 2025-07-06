import { exec } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as util from 'node:util'
import type { Release } from './release.js'

const distDir = path.dirname(fileURLToPath(import.meta.url))
const packageJsonDir = path.dirname(distDir)
const execAsync = util.promisify(exec)
const { stdout, stderr } = await execAsync('npm --loglevel error ci --only=prod', {
  cwd: packageJsonDir
})

console.log(stdout)
if (stderr) {
  console.error('Error during npm ci - packages installed dynamically at runtime')
  console.error(stderr)
  process.exit(1)
}

const core = await import('@actions/core')
const changelogFile: string = core.getInput('changelog-file', { required: false })
const tagFormat: string = core.getInput('tag-format', { required: true })

const { release } = await import('./release.js')

let result: Release | false
try {
  result = await release({ changelogFile, tagFormat })
} catch (e) {
  core.setFailed(e as Error)
  process.exit(1)
}

if (!result) {
  console.log('No new release found')
  process.exit(1)
}

const notesFilePath = '/tmp/release-gen-notes'
await fs.writeFile(notesFilePath, result.notes, 'utf8')

core.setOutput('next_version', result.nextVersion)
core.setOutput('notes_file', notesFilePath)
