import type { BranchSpec } from 'semantic-release'
import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper } from './TestHelper.js'

const TIMEOUT = 120_000 // 2 min

const helper = new TestHelper('prerelease')

describe('prerelease', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('prerelease', async () => {
    const branch = 'beta' // latest tag v3.0.0-beta.3
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

    expect(release.channel).toBe('beta')
    expect(release.gitTag).toBe('v3.0.0-beta.4')
    expect(release.gitTags).toEqual(['v3.0.0-beta.4'])
    expect(release.prerelease).toBe(true)
  }, TIMEOUT)
})
