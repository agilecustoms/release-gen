import { beforeAll, beforeEach, afterEach, expect, describe, it } from 'vitest'
import { TestHelper, type Release } from './TestHelper.js'

const helper = new TestHelper('angular')

describe('angular', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)
  const runFix = helper.runFix.bind(helper)
  const runFeat = helper.runFeat.bind(helper)
  const runBreaking = helper.runBreaking.bind(helper)

  it('patch', async () => {
    const release: Release = await runFix('int-test050')

    expect(release.version).toBe('v0.5.1')
  })

  it('minor', async () => {
    const branch = 'int-test050'

    const release: Release = await runFeat(branch)

    expect(release.version).toBe('v0.6.0')
  })

  // scope of testing: ability to make a patch release with 'docs' in angular preset
  it('docs-patch', async () => {
    checkout('int-test050')
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

    const release: Release = await runReleaseGen({ releasePlugins: plugins })

    expect(release.version).toBe('v0.5.1')
  })

  // scope of testing: major release, non-default tagFormat (specified in .releaserc.json)
  it('major', async () => {
    const branch = 'main' // version 2.x.x

    const release: Release = await runBreaking(branch)

    expect(release.version).toBe('3.0.0')
  })
})
