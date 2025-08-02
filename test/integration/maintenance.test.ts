import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, TIMEOUT } from './TestHelper.js'

const helper = new TestHelper('maintenance')

describe('maintenance', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const runFix = helper.runFix.bind(helper)
  const runFeat = helper.runFeat.bind(helper)

  it('maintenance-patch', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches = ['main',
      branch
    ]

    const release = await runFix(branch, { releaseBranches })

    expect(release.version).toBe('v1.3.1')
    expect(release.channel).toBeUndefined()
    expect(release.gitTags).toEqual(['v1.3.1', 'v1.3', 'v1'])
    expect(release.tags).toEqual(['v1.3.1', 'v1.3', 'v1'])
  }, TIMEOUT)

  it('maintenance-minor', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches: BranchSpec[] = ['main',
      branch
    ]

    const release = await runFeat(branch, { releaseBranches })

    expect(release.version).toBe('v1.4.0')
    expect(release.channel).toBeUndefined()
    expect(release.gitTags).toEqual(['v1.4.0', 'v1.4', 'v1'])
    expect(release.tags).toEqual(['v1.4.0', 'v1.4', 'v1'])
  }, TIMEOUT)

  it('maintenance-minor-channel', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.x.x',
      range: '1.x.x',
      channel: '1.x.x'
    }]

    const release = await runFeat(branch, { releaseBranches })

    expect(release.version).toBe('v1.4.0')
    expect(release.channel).toBe('1.x.x')
    expect(release.gitTags).toEqual(['v1.4.0', 'v1.4', 'v1'])
    expect(release.tags).toEqual(['v1.4.0', 'v1.4', 'v1', '1.x.x'])
  }, TIMEOUT)

  it('maintenance-minor-channel2', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.x.x',
      range: '1.x.x',
      channel: 'support'
    }]

    const release = await runFeat(branch, { releaseBranches })

    expect(release.version).toBe('v1.4.0')
    expect(release.channel).toBe('support')
    expect(release.gitTags).toEqual(['v1.4.0', 'v1.4', 'v1', 'support'])
    expect(release.tags).toEqual(['v1.4.0', 'v1.4', 'v1', 'support'])
  }, TIMEOUT)
})
