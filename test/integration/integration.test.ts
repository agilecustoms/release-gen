import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, beforeEach, describe, it } from 'vitest'

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
    const branch = 'main'

    function exec(command: string) {
      execSync(command, { cwd: testDir, stdio: 'inherit' })
    }

    // sparse checkout, specifically if clone with test, then vitest recognize all tests inside and try to run them!
    exec(`git clone --no-checkout --filter=blob:none https://${repoUrl} .`)
    exec('git sparse-checkout init --cone')
    exec(`git checkout ${branch}`)
    // w/o user.name and user.email git will fail to commit on CI
    exec('git config user.name "CI User"')
    exec('git config user.email "ci@example.com"')
    // simple change and commit
    fs.writeFileSync(`${testDir}/test.txt`, 'test content', 'utf8')
    exec('git add .')
    exec('git commit -m "fix: delete all dirs"')

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // release-gen action is run from completely different directory, so it uses GITHUB_WORKSPACE to find actual repo that needs to be released
      // in our case the repo lays deep inside, so need to nudge release-gen to it
      GITHUB_WORKSPACE: testDir,
      // semantic-release doesn't look into current checked out branch, it stiffs for current CI tool by various env vars
      // then for each CI tool it has separate logic how to determine current branch, env.GITHUB_REF for GH Actions
      GITHUB_REF: branch
    }
    // when running locally, auth token is auto attached via "insteadOf" rule in .gitconfig
    if (process.env.CI) {
      const githubToken = process.env.GITHUB_TOKEN
      if (!githubToken) throw new Error('GITHUB_TOKEN is not set')
      env['REPOSITORY_URL'] = `https://x-access-token:${githubToken}@${repoUrl}`
    }

    // launch release-gen/test/integration/gh-action/dist/index.js
    const indexJs = path.join(ghActionDistDir, 'index.js')
    execSync(`node ${indexJs}`, { stdio: 'inherit', env: env })
  })
})
