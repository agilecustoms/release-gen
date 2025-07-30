import type { BranchSpec } from 'semantic-release'
import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper } from './TestHelper.js'

const TIMEOUT = 120_000 // 2 min

const helper = new TestHelper('angular')

describe('release-gen', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('patch', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('fix: test')

    const release = await runReleaseGen(branch)

    expect(release.gitTag).toBe('v0.5.1')
    expect(release.channel).toBeUndefined() // double-checked
    // maintenance release and prerelease have channel,
    // main release branch has no default channel at release-gen phase, it is undefined
    // but then in 'git', 'github' plugins of semantic-release it is set to 'latest'
  }, TIMEOUT)

  it('minor', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('feat: test')

    const release = await runReleaseGen(branch)

    expect(release.gitTag).toBe('v0.6.0')
  }, TIMEOUT)

  // scope of testing: ability to make a patch release with 'docs' in angular preset
  it('docs-patch', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('docs: test')
    const plugins = [
      [
        '@semantic-release/commit-analyzer',
        {
          releaseRules: [
            { type: 'docs', release: 'patch' }
          ]
        }
      ],
      '@semantic-release/release-notes-generator'
    ]

    const release = await runReleaseGen(branch, { releasePlugins: plugins })

    expect(release.gitTag).toBe('v0.5.1')
  }, TIMEOUT)

  // scope of testing: major release, non-default tagFormat (specified in .releaserc.json)
  it('major', async () => {
    const branch = 'main' // versions 2.x.x
    checkout(branch)
    commit('feat: test\n\nBREAKING CHANGE: test major release')
    const releaseBranches: BranchSpec[] = [
      {
        name: branch,
        channel: 'the-latest'
      }
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.gitTag).toBe('3.0.0')
    expect(release.channel).toBe('the-latest')
  }, TIMEOUT)
})
