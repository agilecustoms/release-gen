import type { ExecSyncOptions } from 'child_process'
import { execSync, exec as execCallback } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import type { BranchSpec, NextRelease, ReleaseType } from 'semantic-release'
import { beforeAll, beforeEach, expect, describe, it } from 'vitest'

const exec = promisify(execCallback)

const repoUrl = 'github.com/agilecustoms/release-gen.git'

const rootDir = path.resolve(__dirname, '../..')
const assetsDir = path.resolve(__dirname, 'assets')
const distDir = path.join(rootDir, 'dist')
const gitDir = path.join(__dirname, 'git')
const ghActionDir = path.join(__dirname, 'gh-action')
const ghActionDistDir = path.join(ghActionDir, 'dist')

const TIMEOUT = 120_000 // 2 min
let counter = 0

type TestOptions = {
  npmExtraDeps?: string
  releaseBranches?: ReadonlyArray<BranchSpec> | BranchSpec
  releasePlugins?: object
}

const CONVENTIONAL_OPTS = {
  npmExtraDeps: 'conventional-changelog-conventionalcommits@9.1.0'
}

/**
 * DISCLAIMER about semantic-release
 * During dry run it invokes the command ` git push --dry-run --no-verify ${repositoryUrl} HEAD:${branch}`
 * I just want to generate version and release notes, but still have to play this game
 * This command brings a lot of issues:
 * 1. If it fails - you get the misleading error "The local main branch is behind the remote one, therefore, a new version won't be published"
 * 2. Even though this repo is public and I can easily clone it via https, still semantic-release requires a token for `git push --dry-run`.
 *    Moreover: default ${{github.token}} with `permissions: write` is not enough,
 *    I have to use PAT and don't forget to set `secrets: inherit` in build-and-release.yml workflow
 * 3. I tried to use this token when cloning the repo (thus the token stays at .git/config file) - but it is ignored.
 *    semantic-release needs token to be present as a parameter `repositoryUrl`.
 *    Since this parameter is not normally set, I had to augment release-gen code to set it if env variable `REPOSITORY_URL` is passed
 * 4. semantic-release doesn't look into the current (checked-out) branch, it stiffs for the current CI tool by various env vars,
 *    and then for each CI tool it has separate logic how to determine the current branch, env.GITHUB_REF for GH Actions.
 *    If not passed, semantic-release uses the current feature branch name, not a branch from the integration test
 *    This fix with env variable 'GITHUB_REF' only works for non-PR builds, see node_modules/env-ci/services/github.js
 *
 * Note: normally on CI (and also in local setup) the auth token is auto-attached via "insteadOf" rule in .gitconfig
 */
describe('release-gen', () => {
  beforeAll(() => {
    // rebuild source code to reflect any changes while work on tests
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

    // copy the entire release-gen / dist dir into test/integration/gh-action
    fs.rmSync(ghActionDir, { recursive: true, force: true }) // clean before copy
    fs.mkdirSync(ghActionDir)
    execSync(`cp -R "${distDir}" "${ghActionDir}"`)
    // copy root package.json and package-lock.json into test/integration/gh-action
    execSync(`cp "${path.join(rootDir, 'package.json')}" "${ghActionDir}"`)
    execSync(`cp "${path.join(rootDir, 'package-lock.json')}" "${ghActionDir}"`)

    // create 'test/integration/git' directory
    fs.mkdirSync(gitDir, { recursive: true })
  })

  beforeEach((ctx) => {
    // some tests install extra dependency, need to remove it to avoid race conditions
    const npmDynamicDep = path.join(ghActionDir, 'node_modules/conventional-changelog-conventionalcommits')
    fs.rmSync(npmDynamicDep, { recursive: true, force: true })

    const testDir = path.join(gitDir, ctx.task.name)
    // delete (if any) and create a directory for this test
    fs.rmSync(testDir, { recursive: true, force: true })
    fs.mkdirSync(testDir)
  })

  function checkout(testName: string, branch: string): void {
    const cwd = path.join(gitDir, testName)
    const options: ExecSyncOptions = { cwd, stdio: 'inherit' }
    // sparse checkout, specifically if clone with test, then vitest recognize all tests inside and try to run them!
    execSync(`git clone --no-checkout --filter=blob:none https://${repoUrl} .`, options)
    execSync('git sparse-checkout init --cone', options)
    execSync(`git checkout ${branch}`, options)
    // w/o user.name and user.email git will fail to commit on CI
    execSync('git config user.name "CI User"', options)
    execSync('git config user.email "ci@example.com"', options)
    // copy assets/{testName}/* into test/integration/git/{testName}
    const assetsSrc = path.join(assetsDir, testName)
    if (fs.existsSync(assetsSrc)) {
      fs.cpSync(assetsSrc, cwd, { recursive: true })
    }
  }

  function commit(testName: string, msg: string) {
    const cwd = path.join(gitDir, testName)
    const options: ExecSyncOptions = { cwd, stdio: 'inherit' }
    fs.writeFileSync(`${cwd}/test${++counter}.txt`, 'test content', 'utf8')
    execSync('git add .', options)
    execSync(`git commit -m "${msg}"`, options)
  }

  async function runReleaseGen(testName: string, branch: string, opts: TestOptions = {}): Promise<NextRelease> {
    const cwd = path.join(gitDir, testName)
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // release-gen action is run from a completely different directory, so it uses GITHUB_WORKSPACE to find the actual repo that needs to be released
      // in our case the repo lays deep inside, so need to nudge release-gen to it
      GITHUB_WORKSPACE: cwd,
      GITHUB_REF: branch, // see a DISCLAIMER above
      GITHUB_OUTPUT: '', // this makes `core.setOutput` to print to stdout instead of file

      // feed GH actions core.getInput with env vars
      INPUT_RELEASE_BRANCHES: JSON.stringify([branch]),
    }
    if (opts.npmExtraDeps) {
      env['INPUT_NPM_EXTRA_DEPS'] = opts.npmExtraDeps
    }
    if (opts.releaseBranches) {
      env['INPUT_RELEASE_BRANCHES'] = JSON.stringify(opts.releaseBranches)
    }
    if (opts.releasePlugins) {
      env['INPUT_RELEASE_PLUGINS'] = JSON.stringify(opts.releasePlugins)
    }

    if (process.env.CI) { // see a DISCLAIMER above
      const githubToken = process.env.GITHUB_TOKEN
      if (!githubToken) throw new Error('GITHUB_TOKEN is not set')
      env['REPOSITORY_URL'] = `https://x-access-token:${githubToken}@${repoUrl}`
    }

    // launch release-gen/test/integration/gh-action/dist/index.js
    const indexJs = path.join(ghActionDistDir, 'index.js')

    const { stdout, stderr } = await exec(`node ${indexJs}`, {
      env,
      cwd,
      timeout: TIMEOUT,
      maxBuffer: 1024 * 1024 // 1MB buffer size
    })

    // Log stderr if there's any (but don't throw)
    if (stderr) {
      console.warn('stderr output:', stderr)
    }

    // Parse "::set-output" lines into a map
    const outputMap: Record<string, string> = {}
    const regex = /::set-output name=([^:]+)::([^\n]+)/g
    let match
    while ((match = regex.exec(stdout)) !== null) {
      outputMap[match[1]!] = match[2]!
    }

    // outputMap now contains all set-output key-value pairs
    return {
      gitTag: outputMap['git_tag']!,
      notes: fs.readFileSync(outputMap['notes_file']!, 'utf8'),
      type: outputMap['type'] as ReleaseType,
      channel: outputMap['channel']!
    } as NextRelease
  }

  it('patch', async (ctx) => {
    const testName = ctx.task.name
    const branch = 'int-test050'
    checkout(testName, branch)
    commit(testName, 'fix: test')

    const release = await runReleaseGen(testName, branch)

    expect(release.gitTag).toBe('v0.5.1')
    // expect(release.channel).toBe('latest')
  }, TIMEOUT)

  it('minor', async (ctx) => {
    const testName = ctx.task.name
    const branch = 'int-test050'
    checkout(testName, branch)
    commit(testName, 'feat: test')

    const release = await runReleaseGen(testName, branch)

    expect(release.gitTag).toBe('v0.6.0')
  }, TIMEOUT)

  // scope of testing: ability to make a patch release with 'docs' in angular preset
  it('docs-patch', async (ctx) => {
    const testName = ctx.task.name
    const branch = 'int-test050'
    checkout(testName, branch)
    commit(testName, 'docs: test')
    const plugins = [
      [
        '@semantic-release/commit-analyzer',
        {
          releaseRules: [
            { type: 'docs', release: 'patch' }
          ]
        }
      ],
      '@semantic-release/release-notes-generator'
    ]

    const release = await runReleaseGen(testName, branch, { releasePlugins: plugins })

    expect(release.gitTag).toBe('v0.5.1')
  }, TIMEOUT)

  // scope of testing: major release, non-default tagFormat (specified in .releaserc.json)
  it('major', async (ctx) => {
    const testName = ctx.task.name
    const branch = 'main' // versions 2.x.x
    checkout(testName, branch)
    commit(testName, 'feat: test\n\nBREAKING CHANGE: test major release')
    const releaseBranches: BranchSpec[] = [
      {
        name: branch,
        channel: 'the-latest'
      }
    ]

    const release = await runReleaseGen(testName, branch, { releaseBranches })

    expect(release.gitTag).toBe('3.0.0')
    expect(release.channel).toBe('the-latest')
  }, TIMEOUT)

  // if no conventional-changelog-conventionalcommits npm dep => clear error
  // test custom tag format
  // test major version bump with feat! tag
  it('conventionalcommits', async (ctx) => {
    const testName = ctx.task.name
    const branch = 'int-test050'
    checkout(testName, branch)

    const error = await expectError(async () => {
      await runReleaseGen(testName, branch)
    })
    expect(error).toBe('You\'re using non default preset, please specify corresponding npm package in npm-extra-deps input.'
      + ' Details: Cannot find module \'conventional-changelog-conventionalcommits\'')

    commit(testName, 'feat(api)!: new major release')
    const release = await runReleaseGen(testName, branch, CONVENTIONAL_OPTS)
    expect(release.gitTag).toBe('1.0.0')
    expect(release.notes).toContain('BREAKING CHANGES')
  }, TIMEOUT)

  // test my own convention settings I'm using internally for agilecustoms projects:
  // 1. disable 'perf:'
  // 2. add "docs:" commit -> "Documentation" section in release notes
  // 2. add "misc:" commit -> "Miscellaneous" section in release notes
  it('conventionalcommits-custom', async (ctx) => {
    const testName = ctx.task.name
    const branch = 'int-test050'
    checkout(testName, branch)

    // check some default types do not do version bump (and also perf is disabled)
    commit(testName, 'style: test')
    commit(testName, 'refactor: test')
    commit(testName, 'test: test')
    commit(testName, 'chore: test')
    commit(testName, 'build: test')
    commit(testName, 'ci: test')
    commit(testName, 'perf: perf 1')
    const error = await expectError(async () => {
      await runReleaseGen(testName, branch, CONVENTIONAL_OPTS)
    })
    expect(error).toBe('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)')

    // check types that make minor bump, and also perf is disabled
    commit(testName, 'perf: test perf')
    commit(testName, 'misc: minor improvements')
    commit(testName, 'fix: buf fix')
    commit(testName, 'docs: test documentation')
    const release = await runReleaseGen(testName, branch, CONVENTIONAL_OPTS)
    expect(release.gitTag).toBe('v0.5.1')
    expect(release.notes).toContain('### Bug Fixes')
    expect(release.notes).toContain('### Documentation')
    expect(release.notes).toContain('### Miscellaneous')
  }, TIMEOUT)

  async function expectError(callable: () => Promise<void>): Promise<string> {
    let error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      await callable()
    } catch (e) {
      error = e
    }
    expect(error).toBeDefined()
    const out = error.stdout.toString()
    const iError = out.indexOf('::error::')
    expect(iError, 'Expected output to contain "::error::"').toBeGreaterThanOrEqual(0)
    const nextLine = out.indexOf('\n', iError)
    return out.substring(iError + 9, nextLine > 0 ? nextLine : undefined).trim()
  }

  it('maintenance-patch', async (ctx) => {
    const testName = ctx.task.name
    const branch = '1.x.x' // latest tag v1.2.0
    checkout(testName, branch)
    commit(testName, 'fix: test')
    const releaseBranches = [
      'main',
      branch
    ]

    const release = await runReleaseGen(testName, branch, { releaseBranches })

    expect(release.gitTag).toBe('v1.2.1')
    expect(release.channel).toBe(branch)
  }, TIMEOUT)

  it('maintenance-minor', async (ctx) => {
    const testName = ctx.task.name
    const branch = '1.x.x' // latest tag v1.2.0
    checkout(testName, branch)
    commit(testName, 'feat: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: '1.x.x', // if `name` was say "legacy", then `range` would matter
        range: '1.x.x',
        channel: 'legacy'
      }
    ]

    const release = await runReleaseGen(testName, branch, { releaseBranches })

    expect(release.gitTag).toBe('v1.3.0')
    expect(release.channel).toBe('legacy')
  }, TIMEOUT)

  it('prerelease', async (ctx) => {
    const testName = ctx.task.name
    const branch = 'beta' // latest tag v3.0.0-beta.1
    checkout(testName, branch)
    commit(testName, 'fix: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: branch,
        prerelease: true
      }
    ]

    const release = await runReleaseGen(testName, branch, { releaseBranches })

    expect(release.gitTag).toBe('v3.0.0-beta.2')
    expect(release.channel).toBe('beta')
    expect(release.type).toBe('patch')
  }, TIMEOUT)
})
