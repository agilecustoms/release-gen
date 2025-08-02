import type { ExecSyncOptions } from 'child_process'
import { execSync, exec as execCallback } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import type { BranchSpec, NextRelease } from 'semantic-release'
import type { TestContext } from 'vitest'
import type { ReleaseDetails } from '../../src/model.js'

const exec = promisify(execCallback)

const repoUrl = 'github.com/agilecustoms/release-gen.git'

export const TIMEOUT = 120_000 // 2 min
let counter = 0

export type TestOptions = {
  npmExtraDeps?: string
  // if 'releaseBranches' key is set but null or undefine, then use semantic-release default
  releaseBranches?: ReadonlyArray<BranchSpec> | BranchSpec | undefined
  releasePlugins?: object
}

export type Release = NextRelease & ReleaseDetails

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
export class TestHelper {
  private readonly ghActionDir: string
  private readonly gitDir: string

  constructor(itName: string) {
    const itDir = path.join(__dirname, itName)
    this.ghActionDir = path.join(itDir, 'gh-action')
    this.gitDir = path.join(itDir, 'git')
  }

  private testName!: string
  private testDir!: string
  private branchName!: string

  public beforeAll(): void {
    const rootDir = path.resolve(__dirname, '../..')
    const distDir = path.join(rootDir, 'dist')
    // rebuild source code to reflect any changes while work on tests
    execSync(`npm run build -- --outDir ${distDir}`, { cwd: rootDir, stdio: 'inherit' })

    // copy entire 'release-gen/dist/{itName}' dir into test/integration/{itName}/gh-action
    fs.rmSync(this.ghActionDir, { recursive: true, force: true }) // clean before copy
    fs.mkdirSync(this.ghActionDir, { recursive: true })
    execSync(`cp -R "${distDir}" "${this.ghActionDir}"`)
    // copy root package.json and package-lock.json into test/integration/{itName}/gh-action
    execSync(`cp "${path.join(rootDir, 'package.json')}" "${this.ghActionDir}"`)
    execSync(`cp "${path.join(rootDir, 'package-lock.json')}" "${this.ghActionDir}"`)

    // create 'test/integration/{itName}/git' directory
    fs.mkdirSync(this.gitDir, { recursive: true })
  }

  public beforeEach(ctx: TestContext): void {
    this.testName = ctx.task.name
    this.testDir = path.join(this.gitDir, this.testName)

    // some tests install extra dependency, need to remove it to avoid race conditions
    const npmDynamicDep = path.join(this.ghActionDir, 'node_modules/conventional-changelog-conventionalcommits')
    fs.rmSync(npmDynamicDep, { recursive: true, force: true })

    // delete (if any) and create a directory for this test
    fs.rmSync(this.testDir, { recursive: true, force: true })
    fs.mkdirSync(this.testDir)
  }

  public afterEach(): void {
    fs.rmSync(this.testDir, { recursive: true, force: true })
  }

  public checkout(branch: string): void {
    this.branchName = branch
    const cwd = this.testDir
    const options: ExecSyncOptions = { cwd, stdio: 'inherit' }
    // sparse checkout, specifically if clone with test, then vitest recognize all tests inside and try to run them!
    execSync(`git clone --no-checkout --filter=blob:none https://${repoUrl} .`, options)
    execSync('git sparse-checkout init --cone', options)
    execSync(`git checkout ${branch}`, options)
    // w/o user.name and user.email git will fail to commit on CI
    execSync('git config user.name "CI User"', options)
    execSync('git config user.email "ci@example.com"', options)
    // copy assets/{testName}/* into test/integration/git/{testName}
    const assetsDir = path.resolve(__dirname, 'assets')
    const assetsSrc = path.join(assetsDir, this.testName)
    if (fs.existsSync(assetsSrc)) {
      fs.cpSync(assetsSrc, cwd, { recursive: true })
    }
  }

  public commit(msg: string): void {
    const cwd = this.testDir
    const options: ExecSyncOptions = { cwd, stdio: 'inherit' }
    fs.writeFileSync(`${cwd}/test${++counter}.txt`, 'test content', 'utf8')
    execSync('git add .', options)
    execSync(`git commit -m "${msg}"`, options)
  }

  public async runReleaseGen(opts: TestOptions = {}): Promise<Release> {
    const branch = this.branchName
    const cwd = this.testDir
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // release-gen action is run from a completely different directory, so it uses GITHUB_WORKSPACE to find the actual repo that needs to be released
      // in our case the repo lays deep inside, so need to nudge release-gen to it
      GITHUB_WORKSPACE: cwd,
      GITHUB_REF: branch, // see a DISCLAIMER above
      GITHUB_OUTPUT: '', // this makes `core.setOutput` to print to stdout instead of file
    }
    if (opts.npmExtraDeps) {
      env['INPUT_NPM_EXTRA_DEPS'] = opts.npmExtraDeps
    }
    if (!('releaseBranches' in opts)) {
      opts.releaseBranches = [branch]
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

    // launch release-gen/test/integration/{itName}/gh-action/dist/index.js
    const indexJs = path.join(this.ghActionDir, 'dist', 'index.js')

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
      channel: outputMap['channel']!,
      gitTags: outputMap['git_tags']!.split(' '),
      notes: fs.readFileSync(outputMap['notes_file']!, 'utf8'),
      prerelease: outputMap['prerelease'] === 'true',
      tags: outputMap['tags']!.split(' '),
      version: outputMap['version']!,
    } as Release
  }

  public async runFix(branch: string, opts: TestOptions = {}): Promise<Release> {
    this.checkout(branch)
    this.commit('fix: test')
    return this.runReleaseGen(opts)
  }

  public async runFeat(branch: string, opts: TestOptions = {}): Promise<Release> {
    this.checkout(branch)
    this.commit('feat: test')
    return this.runReleaseGen(opts)
  }

  public async runBreaking(branch: string, opts: TestOptions = {}): Promise<Release> {
    this.checkout(branch)
    this.commit('fix: test\nBREAKING CHANGE: test')
    return this.runReleaseGen(opts)
  }
}
