import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Release } from '../../src/model.js'

const repoUrl = 'github.com/agilecustoms/release-gen.git'

const rootDir = path.resolve(__dirname, '../..')
const distDir = path.join(rootDir, 'dist')
const gitDir = path.join(__dirname, 'git')
const ghActionDir = path.join(__dirname, 'gh-action')
const ghActionDistDir = path.join(ghActionDir, 'dist')

describe('release-gen', () => {
  beforeAll(() => {
    // rebuild source code to reflect any changes while work on tests
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

    // copy entire release-gen/dist dir into test/integration/gh-action
    fs.rmSync(ghActionDir, { recursive: true, force: true }) // clean before copy
    fs.mkdirSync(ghActionDir, { recursive: true })
    execSync(`cp -R "${distDir}" "${ghActionDir}"`)
    // copy root package.json and package-lock.json into test/integration/gh-action
    execSync(`cp "${path.join(rootDir, 'package.json')}" "${ghActionDir}"`)
    execSync(`cp "${path.join(rootDir, 'package-lock.json')}" "${ghActionDir}"`)

    // create test/integration/git directory
    fs.mkdirSync(gitDir, { recursive: true })
  })

  beforeEach((ctx) => {
    const testDir = path.join(gitDir, ctx.task.name)
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('minor', async (ctx) => {
    // create a directory for this test
    const testDir = path.join(gitDir, ctx.task.name)
    fs.mkdirSync(testDir, { recursive: true })

    function exec(command: string) {
      execSync(command, { cwd: testDir, stdio: 'inherit' })
    }

    // sparse checkout, specifically if clone with test, then vitest recognize all tests inside and try to run them!
    exec(`git clone --no-checkout --filter=blob:none https://${repoUrl} .`)
    exec('git sparse-checkout init --cone')
    exec('git checkout')
    // w/o user.name and user.email git will fail to commit on CI
    exec('git config user.name "CI User"')
    exec('git config user.email "ci@example.com"')
    // simple change and commit
    fs.writeFileSync(`${testDir}/test.txt`, 'test content', 'utf8')
    exec('git add .')
    exec('git commit -m "fix: test file"')

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GITHUB_WORKSPACE: testDir
    }
    // when running locally, auth token is auto attached via "insteadOf" rule in .gitconfig
    if (process.env.CI) {
      const githubToken = process.env.GITHUB_TOKEN
      if (!githubToken) throw new Error('GITHUB_TOKEN is not set')
      env['REPOSITORY_URL'] = `https://x-access-token:${githubToken}@${repoUrl}`
    }

    // launch release-gen/test/integration/gh-action/dist/index.js
    const indexJs = path.join(ghActionDistDir, 'index.js')
    const buffer = execSync(`node ${indexJs}`, { env: env })
    const output = buffer.toString()
    console.log(output)
    // Parse "::set-output" lines into a map
    const outputMap: Record<string, string> = {}
    const regex = /::set-output name=([^:]+)::([^\n]+)/g
    let match
    while ((match = regex.exec(output)) !== null) {
      outputMap[match[1]!] = match[2]!
    }
    console.log('Output Map:', outputMap)
    // outputMap now contains all set-output key-value pairs
    const release: Release = {
      nextVersion: outputMap['next_version']!,
      notes: fs.readFileSync(outputMap['notes_file']!, 'utf8')
    }
    expect(release.nextVersion).not.toMatch(/0$/)
  })
})
