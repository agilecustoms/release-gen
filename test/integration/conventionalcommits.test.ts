import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper } from './TestHelper.js'

const TIMEOUT = 120_000 // 2 min

const CONVENTIONAL_OPTS = {
  npmExtraDeps: 'conventional-changelog-conventionalcommits@9.1.0'
}

const helper = new TestHelper('conventionalcommits')

describe('conventionalcommits', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

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
    expect(release.version).toBe('1.0.0')
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
    expect(release.version).toBe('v0.5.1')
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
})
