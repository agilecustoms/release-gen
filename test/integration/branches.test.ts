import type { BranchSpec } from 'semantic-release'
import { beforeAll, beforeEach, afterEach, expect, describe, it } from 'vitest'
import { type Release, TestHelper } from './TestHelper.js'

const helper = new TestHelper('branches')

describe('branches', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const runBreaking = helper.runBreaking.bind(helper)
  const runFeat = helper.runFeat.bind(helper)

  /**
   * here I test what happens if "branches" in .releaserc.json is not array, but a string "main"
   * So that I safely use options.branches in the code
   */
  it('single-branch', async () => {
    const branch = 'main' // latest tag v2.x.x

    const release: Release = await runBreaking(branch, { releaseBranches: undefined })

    expect(release.version).toBe('v3.0.0')
    expect(release.gitTags).toEqual(['v3.0.0', 'v3.0', 'v3', 'latest'])
  })

  it('channel-with-placeholder', async () => {
    const branch = 'int-test050'
    const releaseBranches: ReadonlyArray<BranchSpec> = [{
      name: branch,
      channel: '${name}-channel',
    }]

    const release: Release = await runFeat(branch, { releaseBranches })

    expect(release.channel).toBe('int-test050-channel')
  })
})
