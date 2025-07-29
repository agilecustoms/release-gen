import type { BranchSpec } from 'semantic-release'
import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper } from './TestHelper.js'

const TIMEOUT = 120_000 // 2 min

const CONVENTIONAL_OPTS = {
  npmExtraDeps: 'conventional-changelog-conventionalcommits@9.1.0'
}

const helper = new TestHelper()

describe('release-gen', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('patch', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('fix: test')

    const release = await runReleaseGen(branch)

    expect(release.gitTag).toBe('v0.5.1')
    expect(release.channel).toBeUndefined() // double-checked
    // maintenance release and prerelease have channel,
    // main release branch has no default channel at release-gen phase, it is undefined
    // but then in 'git', 'github' plugins of semantic-release it is set to 'latest'
  }, TIMEOUT)

  it('minor', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('feat: test')

    const release = await runReleaseGen(branch)

    expect(release.gitTag).toBe('v0.6.0')
  }, TIMEOUT)

  // scope of testing: ability to make a patch release with 'docs' in angular preset
  it('docs-patch', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('docs: test')
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

    const release = await runReleaseGen(branch, { releasePlugins: plugins })

    expect(release.gitTag).toBe('v0.5.1')
  }, TIMEOUT)

  // scope of testing: major release, non-default tagFormat (specified in .releaserc.json)
  it('major', async () => {
    const branch = 'main' // versions 2.x.x
    checkout(branch)
    commit('feat: test\n\nBREAKING CHANGE: test major release')
    const releaseBranches: BranchSpec[] = [
      {
        name: branch,
        channel: 'the-latest'
      }
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.gitTag).toBe('3.0.0')
    expect(release.channel).toBe('the-latest')
  }, TIMEOUT)

  // if no conventional-changelog-conventionalcommits npm dep => clear error
  // test custom tag format
  // test major version bump with feat! tag
  it('conventionalcommits', async () => {
    const branch = 'int-test050'
    checkout(branch)

    const error = await expectError(async () => {
      await runReleaseGen(branch)
    })
    expect(error).toBe('You\'re using non default preset, please specify corresponding npm package in npm-extra-deps input.'
      + ' Details: Cannot find module \'conventional-changelog-conventionalcommits\'')

    commit('feat(api)!: new major release')
    const release = await runReleaseGen(branch, CONVENTIONAL_OPTS)
    expect(release.gitTag).toBe('1.0.0')
    expect(release.notes).toContain('BREAKING CHANGES')
  }, TIMEOUT)

  // test my own convention settings I'm using internally for agilecustoms projects:
  // 1. disable 'perf:'
  // 2. add "docs:" commit -> "Documentation" section in release notes
  // 2. add "misc:" commit -> "Miscellaneous" section in release notes
  it('conventionalcommits-custom', async () => {
    const branch = 'int-test050'
    checkout(branch)

    // check some default types do not do version bump (and also perf is disabled)
    commit('style: test')
    commit('refactor: test')
    commit('test: test')
    commit('chore: test')
    commit('build: test')
    commit('ci: test')
    commit('perf: perf 1')
    const error = await expectError(async () => {
      await runReleaseGen(branch, CONVENTIONAL_OPTS)
    })
    expect(error).toBe('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)')

    // check types that make minor bump, and also perf is disabled
    commit('perf: test perf')
    commit('misc: minor improvements')
    commit('fix: buf fix')
    commit('docs: test documentation')
    const release = await runReleaseGen(branch, CONVENTIONAL_OPTS)
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

  it('maintenance-patch', async () => {
    const branch = '1.x.x' // latest tag v1.2.0
    checkout(branch)
    commit('fix: test')
    const releaseBranches = [
      'main',
      branch
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.gitTag).toBe('v1.2.1')
    expect(release.channel).toBe(branch)
  }, TIMEOUT)

  it('maintenance-minor', async () => {
    const branch = '1.x.x' // latest tag v1.2.0
    checkout(branch)
    commit('feat: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: '1.x.x', // if `name` was say "legacy", then `range` would matter
        range: '1.x.x',
        channel: 'legacy'
      }
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.gitTag).toBe('v1.3.0')
    expect(release.channel).toBe('legacy')
  }, TIMEOUT)

  it('prerelease', async () => {
    const branch = 'beta' // latest tag v3.0.0-beta.1
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: branch,
        prerelease: true
      }
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.gitTag).toBe('v3.0.0-beta.2')
    expect(release.channel).toBe('beta')
    expect(release.prerelease).toBe(true)
  }, TIMEOUT)
})
