import { beforeAll, beforeEach, afterEach, expect, describe, it } from 'vitest'
import { type Release, TestHelper } from './TestHelper.js'

const helper = new TestHelper('default-minor')

describe('default-minor', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('should-bump-minor', async () => {
    const branch = 'int-test050'
    await checkout(branch)
    await commit('test commit')

    const release: Release = await runReleaseGen({ defaultMinor: true })

    expect(release.version).toBe('v0.6.0')
    expect(release.gitTags).toEqual(['v0.6.0', 'v0.6', 'v0', 'latest'])
    expect(release.notesTmpFile).toBe('')
  })

  it('should-return-notesTmpFile', async () => {
    const branch = 'int-test050'
    await checkout(branch)
    await commit('feat: commit')

    const release: Release = await runReleaseGen()

    expect(release.version).toBe('v0.6.0')
    expect(release.notesTmpFile).toBeTruthy() // /tmp/release-gen-notes-kuhpg1g7mt
  })
})
