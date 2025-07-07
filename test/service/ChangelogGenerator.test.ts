import fs from 'fs'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ChangelogGenerator } from '../../src/service/ChangelogGenerator.js'

const FILE = 'test/CHANGELOG.md'

function major(version: string): string {
  return `# [${version}] Major`
}

function expectChangelog(content: string): void {
  const actualContent = fs.readFileSync(FILE, 'utf8')
  expect(actualContent).toBe(content)
}

describe('ChangelogGenerator', () => {
  const changelogGenerator = new ChangelogGenerator()

  beforeEach(() => {
    fs.rmSync(FILE, { force: true })
  })

  describe('create changelog', () => {
    it('should create changelog with major release', async () => {
      const notes = major('0.1.0')

      await changelogGenerator.generate(FILE, notes)

      expectChangelog(notes)
    })

    it('should create changelog with title and major release', async () => {
      const notes = major('0.1.0')
      const title = 'Changelog Title'

      await changelogGenerator.generate(FILE, notes, title)

      expectChangelog(`${title}\n\n${notes}`)
    })
  })

  describe('update changelog (has no title)', () => {
    it('should update major to major', async () => {
      const notes = major('0.1.0')
      await changelogGenerator.generate(FILE, notes)

      const newNotes = major('0.2.0')
      await changelogGenerator.generate(FILE, newNotes)

      expectChangelog(`${newNotes}\n\n${notes}`)
    })
  })

  // describe('update changelog (has title)', () => {
  //
  // })

  afterAll(() => {
    fs.rmSync(FILE, { force: true })
  })
})
