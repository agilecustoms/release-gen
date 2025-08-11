import { beforeAll, beforeEach, afterEach, expect, describe, it } from 'vitest'
import { TestHelper } from './TestHelper.js'

const helper = new TestHelper('errors')

describe('errors', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const runFix = helper.runFix.bind(helper)

  /**
   * here I test what happens if "branches" in .releaserc.json is not array, but a string "main"
   * So that I safely use options.branches in the code
   */
  it('no version in tag format', async () => {
    const branch = 'int-test050'

    const error = await TestHelper.expectError(async () => {
      await runFix(branch, { tagFormat: 'blah' })
    })
    expect(error).toContain('Invalid tag format (tag-format input or tagFormat in .releaserc.json)')
  })

  it('tag format has unsupported symbol', async () => {
    const branch = 'int-test050'

    const error = await TestHelper.expectError(async () => {
      await runFix(branch, { tagFormat: 'v1:${version}' })
    })
    expect(error).toContain('Invalid tag format (tag-format input or tagFormat in .releaserc.json)')
  })

  it('incorrect json configuration', async () => {
    const branch = 'int-test050'

    const error = await TestHelper.expectError(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await runFix(branch, { releaseBranches: {} as any })
    })
    expect(error).toContain(`Branch "${branch}" not found in branches: [{}]`)
  })
})
