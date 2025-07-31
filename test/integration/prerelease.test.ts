import type { BranchSpec } from 'semantic-release'
import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, type TheNextRelease, TIMEOUT } from './TestHelper.js'

const helper = new TestHelper('prerelease')

describe('prerelease', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('prerelease-default-channel', async () => {
    const branch = 'beta' // latest tag v3.0.0-beta.4
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: branch,
        prerelease: true
      }
    ]

    const release: TheNextRelease = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-beta.5')
    expect(release.channel).toBe('beta')
    expect(release.gitTags).toEqual(['v3.0.0-beta.5'])
    expect(release.tags).toEqual(['v3.0.0-beta.5'])
    expect(release.prerelease).toBe(true)
  }, TIMEOUT)

  it('prerelease-no-channel', async () => {
    const branch = 'beta' // latest tag v3.0.0-beta.4
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: branch,
        prerelease: true,
        channel: ''
      }
    ]

    const release: TheNextRelease = await runReleaseGen(branch, { releaseBranches })

    expect(release.channel).toBe('beta')
    expect(release.prerelease).toBe(true)
  }, TIMEOUT)

  it('prerelease-branch-channel', async () => {
    const branch = 'beta' // latest tag v3.0.0-beta.4
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: branch,
        prerelease: true,
        channel: branch
      }
    ]

    const release: TheNextRelease = await runReleaseGen(branch, { releaseBranches })

    expect(release.channel).toBe(branch)
    expect(release.version).toBe('v3.0.0-beta.5')
    expect(release.gitTags).toEqual(['v3.0.0-beta.5'])
    expect(release.tags).toEqual(['v3.0.0-beta.5', branch])
    expect(release.prerelease).toBe(true)
  }, TIMEOUT)

  it('prerelease-channel', async () => {
    const branch = 'beta' // latest tag v3.0.0-beta.4
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: branch,
        prerelease: true,
        channel: 'the-beta'
      }
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.channel).toBe('the-beta')
    expect(release.prerelease).toBe(true)
  }, TIMEOUT)
})
