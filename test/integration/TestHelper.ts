import type { ExecSyncOptions } from 'child_process'
import type { ExecException } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { BranchSpec, NextRelease } from 'semantic-release'
import { expect, type TestContext } from 'vitest'
import type { ReleaseDetails } from '../../src/model.js'
import { exec } from '../../src/utils.js'

const repoUrl = 'github.com/agilecustoms/release-gen.git'

export const TIMEOUT = 120_000 // 2 min
let counter = 0

export type TestOptions = {
  floatingTags?: boolean
  // if 'releaseBranches' key is set but null or undefine, then use semantic-release default
  releaseBranches?: ReadonlyArray<BranchSpec> | BranchSpec | undefined
  releaseChannel?: string
  releasePlugins?: object
  tagFormat?: string
  version?: string
  versionBump?: string
}

export type Release = NextRelease & ReleaseDetails

class NodeError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause })
    this.name = 'NodeError'
  }
}

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

  public async beforeAll(): Promise<void> {
    const rootDir = path.resolve(__dirname, '../..')
    const distDir = path.join(rootDir, 'dist')
    // rebuild source code to reflect any changes while work on tests
    await exec(`npm run build -- --outDir ${distDir}`, { cwd: rootDir })

    // copy entire 'release-gen/dist/{itName}' dir into test/integration/{itName}/gh-action
    await fs.promises.rm(this.ghActionDir, { recursive: true, force: true }) // clean before copy
    await fs.promises.mkdir(this.ghActionDir, { recursive: true })
    await exec(`cp -R "${distDir}" "${this.ghActionDir}"`)
    // copy root package.json and package-lock.json into test/integration/{itName}/gh-action
    await exec(`cp "${path.join(rootDir, 'package.json')}" "${this.ghActionDir}"`)
    await exec(`cp "${path.join(rootDir, 'package-lock.json')}" "${this.ghActionDir}"`)

    // create 'test/integration/{itName}/git' directory
    await fs.promises.mkdir(this.gitDir, { recursive: true })
  }

  public async beforeEach(ctx: TestContext): Promise<void> {
    this.testName = ctx.task.name
    this.testDir = path.join(this.gitDir, this.testName)

    // some tests install extra dependency, need to remove it to avoid race conditions
    const npmDynamicDep = path.join(this.ghActionDir, 'node_modules/conventional-changelog-conventionalcommits')
    await fs.promises.rm(npmDynamicDep, { recursive: true, force: true })

    // delete (if any) and create a directory for this test
    await fs.promises.rm(this.testDir, { recursive: true, force: true })
    await fs.promises.mkdir(this.testDir)
  }

  public async afterEach(): Promise<void> {
    await fs.promises.rm(this.testDir, { recursive: true, force: true })
  }

  public async checkout(branch: string): Promise<void> {
    this.branchName = branch
    const cwd = this.testDir
    const options: ExecSyncOptions = { cwd, stdio: 'inherit' }
    // sparse checkout, specifically if clone with test, then vitest recognize all tests inside and try to run them!
    await exec(`git clone --no-checkout --filter=blob:none https://${repoUrl} .`, options)
    await exec('git sparse-checkout init --cone', options)
    await exec(`git checkout ${branch}`, options)
    // w/o user.name and user.email git will fail to commit on CI
    await exec('git config user.name "CI User"', options)
    await exec('git config user.email "ci@example.com"', options)
    // copy assets/{testName}/* into test/integration/git/{testName}
    const assetsDir = path.resolve(__dirname, 'assets')
    const assetsSrc = path.join(assetsDir, this.testName)
    if (await fs.promises.stat(assetsSrc).then(() => true, () => false)) {
      await fs.promises.cp(assetsSrc, cwd, { recursive: true })
    }
  }

  public async commit(msg: string): Promise<void> {
    const cwd = this.testDir
    const options: ExecSyncOptions = { cwd, stdio: 'inherit' }
    await fs.promises.writeFile(`${cwd}/test${++counter}.txt`, 'test content', 'utf8')
    await exec('git add .', options)
    await exec(`git commit -m "${msg}"`, options)
  }

  public async runReleaseGen(opts: TestOptions = {}): Promise<Release> {
    const branch = this.branchName
    const cwd = this.testDir
    const env: NodeJS.ProcessEnv = {
      ...process.env,

      // release-gen action is run from a completely different directory, so it uses GITHUB_WORKSPACE to find the actual repo that needs to be released
      // in our case the repo lays deep inside, so need to nudge release-gen to it
      GITHUB_WORKSPACE: cwd,

      // this makes `core.setOutput` to print to stdout instead of file
      GITHUB_OUTPUT: '',

      // semantic-release doesn't look into the current (checked-out) branch, it sniffs for the current CI tool by various env vars,
      // and then for each CI tool it has separate logic how to determine the current branch, env.GITHUB_REF for GH Actions.
      // If not passed, semantic-release uses the current feature branch name, not a branch from the integration test
      // This trick with env variable 'GITHUB_REF' only works for non-PR builds, see node_modules/env-ci/services/github.js
      GITHUB_REF: branch,
    }
    env['INPUT_FLOATING_TAGS'] = opts.floatingTags === false ? 'false' : 'true'
    if (!('releaseBranches' in opts)) {
      opts.releaseBranches = [branch]
    }
    if (opts.releaseBranches) {
      env['INPUT_RELEASE_BRANCHES'] = JSON.stringify(opts.releaseBranches)
    }
    if (opts.releaseChannel) {
      env['INPUT_RELEASE_CHANNEL'] = opts.releaseChannel
    }
    if (opts.releasePlugins) {
      env['INPUT_RELEASE_PLUGINS'] = JSON.stringify(opts.releasePlugins)
    }
    if (opts.tagFormat) {
      env['INPUT_TAG_FORMAT'] = opts.tagFormat
    }
    if (opts.version) {
      env['INPUT_VERSION'] = opts.version
    }
    if (opts.versionBump) {
      env['INPUT_VERSION_BUMP'] = opts.versionBump
    }
    const notesTmpFile = `/tmp/release-gen-notes-${Math.random().toString(36).slice(2)}`
    env['INPUT_NOTES_TMP_FILE'] = notesTmpFile

    // launch release-gen/test/integration/{itName}/gh-action/dist/index.js
    const indexJs = path.join(this.ghActionDir, 'dist', 'index.js')

    const options = {
      env,
      cwd,
      timeout: TIMEOUT,
      maxBuffer: 1024 * 1024 // 1MB buffer size
    }

    let stdout = ''
    let stderr = ''
    try {
      const res = await exec(`node ${indexJs}`, options)
      stdout = res.stdout
      stderr = res.stderr
    } catch (e) {
      const ex = e as ExecException
      console.log(ex.stdout)
      console.error(ex.stderr)
      throw new NodeError('Error running release-gen', e)
    }

    // Log stderr if there's any (but don't throw)
    if (stderr) {
      console.warn('stderr output:', stderr)
    }

    // Parse "::set-output" lines into a map
    const outputMap: Record<string, string> = {}
    const regex = /::set-output name=([^:]+)::([^\n]*)/g
    let match
    while ((match = regex.exec(stdout)) !== null) {
      outputMap[match[1]!] = match[2]!
    }

    let notes = ''
    if (fs.existsSync(notesTmpFile)) {
      notes = await fs.promises.readFile(notesTmpFile, 'utf8')
      fs.rmSync(notesTmpFile)
    }

    // Debug output
    // console.error('AlexC: outputMap:', outputMap)
    // console.error('AlexC: stdout:', stdout)

    // outputMap now contains all set-output key-value pairs
    return {
      channel: outputMap['channel']!,
      gitTags: outputMap['git_tags']!.split(' '),
      notes,
      notesTmpFile: outputMap['notes_tmp_file'],
      prerelease: outputMap['prerelease'] === 'true',
      tags: outputMap['tags']!.split(' '),
      version: outputMap['version']!,
    } as Release
  }

  public async runFix(branch: string, opts: TestOptions = {}): Promise<Release> {
    await this.checkout(branch)
    await this.commit('fix: test')
    return this.runReleaseGen(opts)
  }

  public async runFeat(branch: string, opts: TestOptions = {}): Promise<Release> {
    await this.checkout(branch)
    await this.commit('feat: test')
    return this.runReleaseGen(opts)
  }

  public async runBreaking(branch: string, opts: TestOptions = {}): Promise<Release> {
    await this.checkout(branch)
    await this.commit('fix: test\nBREAKING CHANGE: test')
    return this.runReleaseGen(opts)
  }

  public static async expectError(callable: () => Promise<void>): Promise<string> {
    let error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      await callable()
    } catch (e) {
      if (e instanceof NodeError) {
        error = e.cause
      } else {
        throw e
      }
    }
    expect(error).toBeDefined()
    const out = error.stdout.toString()
    const iError = out.indexOf('::error::')
    expect(iError, 'Expected output to contain "::error::"').toBeGreaterThanOrEqual(0)
    const nextLine = out.indexOf('\n', iError)
    return out.substring(iError + 9, nextLine > 0 ? nextLine : undefined).trim()
  }
}
