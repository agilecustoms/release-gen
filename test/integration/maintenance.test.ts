import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { type Release, TestHelper } from './TestHelper.js'

const helper = new TestHelper('maintenance')

describe('maintenance', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const runFix = helper.runFix.bind(helper)
  const runFeat = helper.runFeat.bind(helper)

  it('patch', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches = ['main',
      branch
    ]

    const release: Release = await runFix(branch, { releaseBranches })

    expect(release.version).toBe('v1.3.1')
    expect(release.channel).toBe(branch)
    expect(release.gitTags).toEqual(['v1.3.1', 'v1.3', 'v1'])
    expect(release.tags).toEqual(['v1.3.1', 'v1.3', 'v1'])
  })

  it('minor', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches: BranchSpec[] = ['main',
      branch
    ]

    const release: Release = await runFeat(branch, { releaseBranches })

    expect(release.version).toBe('v1.4.0')
    expect(release.channel).toBe(branch)
    expect(release.gitTags).toEqual(['v1.4.0', 'v1.4', 'v1'])
    expect(release.tags).toEqual(['v1.4.0', 'v1.4', 'v1'])
  })

  it('channel-branch', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.x.x',
      range: '1.x.x',
      channel: branch
    }]

    const release: Release = await runFeat(branch, { releaseBranches })

    expect(release.version).toBe('v1.4.0')
    expect(release.channel).toBe(branch)
    expect(release.gitTags).toEqual(['v1.4.0', 'v1.4', 'v1'])
    expect(release.tags).toEqual(['v1.4.0', 'v1.4', 'v1', branch])
  })

  it('channel-custom', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.x.x',
      range: '1.x.x',
      channel: 'support'
    }]

    const release: Release = await runFeat(branch, { releaseBranches })

    expect(release.version).toBe('v1.4.0')
    expect(release.channel).toBe('support')
    expect(release.gitTags).toEqual(['v1.4.0', 'v1.4', 'v1', 'support'])
    expect(release.tags).toEqual(['v1.4.0', 'v1.4', 'v1', 'support'])
  })
})
