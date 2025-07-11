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

/**
 * DISCLAIMER about semantic-release
 * During dry run it invokes command `git push --dry-run --no-verify ${repositoryUrl} HEAD:${branch}`
 * I just want to generate version and release notes, but still have to play this game
 * This command brings a lot of issues:
 * 1. If it fails - you get misleading error "The local branch main is behind the remote one, therefore, a new version won't be published"
 * 2. Even though this repo is public and I can easily clone it via https, still semantic-release requires a token for `git push --dry-run`.
 *    Moreover: default ${{github.token}} with `permissions: write` is not enough,
 *    I have to use PAT and don't forget to set `secrets: inherit` in build-and-release.yml workflow
 * 3. I tried to use this token when cloning the repo (thus the token stays at .git/config file) - but it is ignored.
 *    semantic-release needs token to be present as a parameter `repositoryUrl`.
 *    Since this parameter is not normally set, I had to augment release-gen code to set it if env variable `REPOSITORY_URL` is passed
 * 4. semantic-release doesn't look into current (checked-out) branch, it stiffs for current CI tool by various env vars,
 *    and then for each CI tool it has separate logic how to determine current branch, env.GITHUB_REF for GH Actions.
 *    If not passed, semantic-release uses the current feature branch name, not a branch from integration test
 *    This fix with env variable 'GITHUB_REF' only works for non-PR builds, see node_modules/env-ci/services/github.js
 *
 * Note: normally on CI (and also in local setup) the auth token is auto attached via "insteadOf" rule in .gitconfig
 */
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
    exec('git commit -m "fix: test"')

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // release-gen action is run from completely different directory, so it uses GITHUB_WORKSPACE to find actual repo that needs to be released
      // in our case the repo lays deep inside, so need to nudge release-gen to it
      GITHUB_WORKSPACE: testDir,
      GITHUB_REF: branch // see a DISCLAIMER above
    }

    if (process.env.CI) { // see a DISCLAIMER above
      const githubToken = process.env.GITHUB_TOKEN
      if (!githubToken) throw new Error('GITHUB_TOKEN is not set')
      env['REPOSITORY_URL'] = `https://x-access-token:${githubToken}@${repoUrl}`
    }

    // launch release-gen/test/integration/gh-action/dist/index.js
    const indexJs = path.join(ghActionDistDir, 'index.js')
    execSync(`node ${indexJs}`, { stdio: 'inherit', env })
  })
})
