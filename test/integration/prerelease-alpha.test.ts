import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, type Release } from './TestHelper.js'

const helper = new TestHelper('prerelease-alpha')

describe('prerelease-alpha', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const runBreaking = helper.runBreaking.bind(helper)

  it('channel-default', async () => {
    const branch = 'next' // latest tag v2.4.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: 'alpha'
    }]

    const release: Release = await runBreaking(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-alpha.1')
    expect(release.channel).toBe('next')
    expect(release.gitTags).toEqual(['v3.0.0-alpha.1'])
    expect(release.tags).toEqual(['v3.0.0-alpha.1'])
  })

  it('channel-false', async () => {
    const branch = 'next' // latest tag v2.4.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: 'alpha',
      channel: false
    }]

    const release: Release = await runBreaking(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-alpha.1')
    expect(release.channel).toBe('next')
    expect(release.gitTags).toEqual(['v3.0.0-alpha.1'])
    expect(release.tags).toEqual(['v3.0.0-alpha.1'])
  })

  it('channel-next', async () => {
    const branch = 'next' // latest tag v2.4.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: 'alpha',
      channel: 'next'
    }]

    const release: Release = await runBreaking(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-alpha.1')
    expect(release.channel).toBe('next')
    expect(release.gitTags).toEqual(['v3.0.0-alpha.1'])
    expect(release.tags).toEqual(['v3.0.0-alpha.1', 'next'])
  })

  it('channel-beta', async () => {
    const branch = 'next' // latest tag v2.4.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: 'alpha',
      channel: 'beta'
    }]

    const release: Release = await runBreaking(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-alpha.1')
    expect(release.channel).toBe('beta')
    expect(release.gitTags).toEqual(['v3.0.0-alpha.1', 'beta'])
    expect(release.tags).toEqual(['v3.0.0-alpha.1', 'beta'])
  })
})
