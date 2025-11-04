import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { type Release, TestHelper } from './TestHelper.js'

const helper = new TestHelper('floating-tags-false')

describe('floating-tags-false', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const runFix = helper.runFix.bind(helper)
  const runBreaking = helper.runBreaking.bind(helper)

  it('maintenance-patch', async () => {
    const branch = '1.x.x' // latest tag v1.3.0
    const releaseBranches = ['main',
      branch
    ]

    const release: Release = await runFix(branch, { releaseBranches, floatingTags: false })

    expect(release.version).toBe('v1.3.1')
    expect(release.channel).toBe(branch)
    expect(release.gitTags).toEqual(['v1.3.1'])
    expect(release.tags).toEqual(['v1.3.1'])
  })

  it('prerelease-channel-custom', async () => {
    const branch = 'test-next' // latest tag v3.1.2
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: 'alpha',
      channel: 'beta'
    }]

    const release: Release = await runBreaking(branch, { releaseBranches, floatingTags: false })

    expect(release.version).toBe('v4.0.0-alpha.1')
    expect(release.channel).toBe('beta')
    expect(release.gitTags).toEqual(['v4.0.0-alpha.1'])
    expect(release.tags).toEqual(['v4.0.0-alpha.1'])
  })
})
