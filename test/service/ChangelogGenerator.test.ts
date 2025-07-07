import { ChangelogGenerator } from '../../src/service/ChangelogGenerator.js'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs/promises'

const FILE = 'test/CHANGELOG.md'

function major(version: string): string {
  return `# [${version}] Major`
}

describe('ChangelogGenerator', () => {
  const changelogGenerator = new ChangelogGenerator()

  beforeEach(async () => {
    await fs.rm(FILE, { force: true })
  })

  describe('create changelog', () => {
    it('should create changelog with major release', async () => {
      const notes = major('0.1.0')

      await changelogGenerator.generate(FILE, notes)

      const content = await fs.readFile(FILE, 'utf8')
      expect(content).toBe(notes)
    })

    it('should create changelog with title and major release', async () => {
      const notes = major('0.1.0')
      const title = 'Changelog Title'

      await changelogGenerator.generate(FILE, notes, title)

      const content = await fs.readFile(FILE, 'utf8')
      expect(content).toBe(`${title}\n\n${notes}`)
    })
  })

  // describe('update changelog (has no title)', () => {
  //
  // })
  //
  // describe('update changelog (has title)', () => {
  //
  // })

  afterAll(async () => {
    await fs.rm(FILE, { force: true })
  })
})
