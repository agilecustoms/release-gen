import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, TIMEOUT, type TheNextRelease } from './TestHelper.js'

const helper = new TestHelper('angular')

describe('angular', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('patch', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('fix: test')

    const release: TheNextRelease = await runReleaseGen(branch)

    expect(release.version).toBe('v0.5.1')
  }, TIMEOUT)

  it('minor', async () => {
    const branch = 'int-test050'
    checkout(branch)
    commit('feat: test')

    const release = await runReleaseGen(branch)

    expect(release.version).toBe('v0.6.0')
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

    expect(release.version).toBe('v0.5.1')
  }, TIMEOUT)

  // scope of testing: major release, non-default tagFormat (specified in .releaserc.json)
  it('major', async () => {
    const branch = 'main' // versions 2.x.x
    checkout(branch)
    commit('feat: test\n\nBREAKING CHANGE: test major release')

    const release = await runReleaseGen(branch)

    expect(release.version).toBe('3.0.0')
  }, TIMEOUT)
})
