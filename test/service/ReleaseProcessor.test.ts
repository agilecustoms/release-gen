import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { ChangelogGenerator } from '../../src/service/ChangelogGenerator.js'
import { ReleaseProcessor } from '../../src/service/ReleaseProcessor.js'
import { SemanticReleaseAdapter } from '../../src/service/SemanticReleaseAdapter.js'

const semanticReleaseAdapter = {
  run: vi.fn()
} as SemanticReleaseAdapter & { run: Mock }

const changelogGenerator = {
  generate: vi.fn()
} as ChangelogGenerator & { generate: Mock }

describe('ReleaseProcessor', () => {
  const processor = new ReleaseProcessor(semanticReleaseAdapter, changelogGenerator)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call semantic-release adapter', async () => {
    const options = { tagFormat: 'v${version}' }

    await processor.process(options)

    expect(semanticReleaseAdapter.run).toHaveBeenCalledOnce()
  })

  it('should pass release branches to semantic-release adapter', async () => {
    const options = { tagFormat: 'v${version}', releaseBranches: '[\'main\']' }

    await processor.process(options)

    const args = semanticReleaseAdapter.run.mock.calls[0]
    expect(args![0].branches).toEqual('[\'main\']')
  })
})
