import fs from 'fs'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ChangelogGenerator } from '../../src/service/ChangelogGenerator.js'

const FILE = 'test/CHANGELOG.md'

function minor(version: string): string {
  return `# [${version}] Minor`
}

function patch(version: string): string {
  return `## [${version}] Patch`
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

  async function generate(...versions: string[]) {
    for (const version of versions) {
      await changelogGenerator.generate(FILE, version)
    }
  }

  describe('create changelog', () => {
    it('should create changelog with minor release', async () => {
      const notes = minor('0.1.0')

      await generate(notes)

      expectChangelog(notes)
    })

    it('should create changelog with title and minor release', async () => {
      const notes = minor('0.1.0')
      const title = 'Changelog Title'

      await changelogGenerator.generate(FILE, notes, title)

      expectChangelog(`${title}\n\n${notes}`)
    })
  })

  describe('update changelog (has no title)', () => {
    it('should update minor to minor', async () => {
      const minor1 = minor('0.1.0')
      const minor2 = minor('0.2.0')

      await generate(minor1, minor2)

      expectChangelog(`${minor2}\n\n${minor1}`)
    })

    it('should update minor to patch', async () => {
      const minor1 = minor('0.1.0')
      const patch1 = patch('0.1.1')

      await generate(minor1, patch1)

      expectChangelog(`${patch1}\n\n${minor1}`)
    })

    it('should update patch to minor', async () => {
      const minor1 = minor('0.1.0')
      const patch1 = patch('0.1.1')
      const minor2 = minor('0.2.0')

      await generate(minor1, patch1, minor2)

      expectChangelog(`${minor2}\n\n${patch1}\n\n${minor1}`)
    })

    it('should update patch to patch', async () => {
      const minor1 = minor('0.1.0')
      const patch1 = patch('0.1.1')
      const patch2 = patch('0.1.2')

      await generate(minor1, patch1, patch2)

      expectChangelog(`${patch2}\n\n${patch1}\n\n${minor1}`)
    })
  })

  describe('add title', () => {
    it('should update minor to minor', async () => {
      const minor1 = minor('0.1.0')
      const minor2 = minor('0.2.0')
      const title = 'Changelog Title'

      await generate(minor1)
      await changelogGenerator.generate(FILE, minor2, title)

      expectChangelog(`${title}\n\n${minor2}\n\n${minor1}`)
    })

    it('should update minor to patch', async () => {
      const minor1 = minor('0.1.0')
      const patch1 = patch('0.1.1')
      const title = 'Changelog Title'

      await generate(minor1)
      await changelogGenerator.generate(FILE, patch1, title)

      expectChangelog(`${title}\n\n${patch1}\n\n${minor1}`)
    })

    it('should update patch to minor', async () => {
      const minor1 = minor('0.1.0')
      const patch1 = patch('0.1.1')
      const minor2 = minor('0.2.0')
      const title = 'Changelog Title'

      await generate(minor1, patch1)
      await changelogGenerator.generate(FILE, minor2, title)

      expectChangelog(`${title}\n\n${minor2}\n\n${patch1}\n\n${minor1}`)
    })

    it('should update patch to patch', async () => {
      const minor1 = minor('0.1.0')
      const patch1 = patch('0.1.1')
      const patch2 = patch('0.1.2')
      const title = 'Changelog Title'

      await generate(minor1, patch1)
      await changelogGenerator.generate(FILE, patch2, title)

      expectChangelog(`${title}\n\n${patch2}\n\n${patch1}\n\n${minor1}`)
    })
  })

  describe('update title', () => {
    it('should update minor to minor', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const minor2 = minor('0.2.0')
      const title2 = 'Title2'
      await changelogGenerator.generate(FILE, minor2, title2)

      expectChangelog(`${title2}\n\n${minor2}\n\n${minor1}`)
    })

    it('should update minor to patch', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const patch1 = patch('0.1.1')
      const title2 = 'Title2'
      await changelogGenerator.generate(FILE, patch1, title2)

      expectChangelog(`${title2}\n\n${patch1}\n\n${minor1}`)
    })

    it('should update patch to minor', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const patch1 = patch('0.1.1')
      await changelogGenerator.generate(FILE, patch1, 'Title2')

      const minor2 = minor('0.2.0')
      const title3 = 'Title3'
      await changelogGenerator.generate(FILE, minor2, title3)

      expectChangelog(`${title3}\n\n${minor2}\n\n${patch1}\n\n${minor1}`)
    })

    it('should update patch to patch', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const patch1 = patch('0.1.1')
      await changelogGenerator.generate(FILE, patch1, 'Title2')

      const patch2 = patch('0.1.2')
      const title3 = 'Title3'
      await changelogGenerator.generate(FILE, patch2, title3)

      expectChangelog(`${title3}\n\n${patch2}\n\n${patch1}\n\n${minor1}`)
    })
  })

  describe('remove title', () => {
    it('should update minor to minor', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const minor2 = minor('0.2.0')
      await changelogGenerator.generate(FILE, minor2)

      expectChangelog(`${minor2}\n\n${minor1}`)
    })

    it('should update minor to patch', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const patch1 = patch('0.1.1')
      await changelogGenerator.generate(FILE, patch1)

      expectChangelog(`${patch1}\n\n${minor1}`)
    })

    it('should update patch to minor', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const patch1 = patch('0.1.1')
      await changelogGenerator.generate(FILE, patch1, 'Title2')

      const minor2 = minor('0.2.0')
      await changelogGenerator.generate(FILE, minor2)

      expectChangelog(`${minor2}\n\n${patch1}\n\n${minor1}`)
    })

    it('should update patch to patch', async () => {
      const minor1 = minor('0.1.0')
      await changelogGenerator.generate(FILE, minor1, 'Title1')

      const patch1 = patch('0.1.1')
      await changelogGenerator.generate(FILE, patch1, 'Title2')

      const patch2 = patch('0.1.2')
      await changelogGenerator.generate(FILE, patch2)

      expectChangelog(`${patch2}\n\n${patch1}\n\n${minor1}`)
    })
  })

  describe('whitespaces', () => {
    it('should create and trim', async () => {
      const minor1 = `\n# [0.1.0] Minor\n\n\n`

      await generate(minor1)

      expectChangelog(`# [0.1.0] Minor`)
    })

    it('should update and trim', async () => {
      const minor1 = `\n\n# [0.1.0] Minor\n\n\n`
      const minor2 = `\n\n# [0.2.0] Minor\n\n\n`

      await generate(minor1, minor2)

      expectChangelog(`# [0.2.0] Minor\n\n# [0.1.0] Minor`)
    })
  })

  afterAll(() => {
    fs.rmSync(FILE, { force: true })
  })
})
