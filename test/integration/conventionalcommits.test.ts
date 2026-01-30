import { beforeAll, beforeEach, afterEach, expect, describe, it } from 'vitest'
import { type Release, TestHelper } from './TestHelper.js'

const helper = new TestHelper('conventionalcommits')

describe('conventionalcommits', () => {
  beforeAll(helper.beforeAll.bind(helper), 20_000)
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  // test custom tag format
  // test major version bump with feat! tag
  it('conventionalcommits', async () => {
    await checkout('int-test050')
    await commit('feat(api)!: new major release')

    const release: Release = await runReleaseGen()

    expect(release.version).toBe('1.0.0')
    expect(release.notes).toContain('BREAKING CHANGES')
  })

  // test my own convention settings I'm using internally for agilecustoms projects:
  // 1. disable 'perf:'
  // 2. add "docs:" commit -> "Documentation" section in release notes
  // 2. add "misc:" commit -> "Miscellaneous" section in release notes
  it('conventionalcommits-custom', async () => {
    await checkout('int-test050')

    // check some default types do not do version bump (and also perf is disabled)
    await commit('style: test')
    await commit('refactor: test')
    await commit('test: test')
    await commit('chore: test')
    await commit('build: test')
    await commit('ci: test')
    await commit('perf: perf 1')
    const error = await TestHelper.expectError(async () => {
      await runReleaseGen()
    })
    expect(error).toBe('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)')

    // check types that make minor bump, and also perf is disabled
    await commit('perf: test perf')
    await commit('misc: minor improvements')
    await commit('fix: buf fix')
    await commit('docs: test documentation')
    const release = await runReleaseGen()
    expect(release.version).toBe('v0.5.1')
    expect(release.notes).toContain('### Bug Fixes')
    expect(release.notes).toContain('### Documentation')
    expect(release.notes).toContain('### Miscellaneous')
  })
})
