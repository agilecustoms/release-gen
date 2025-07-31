import fs from 'fs/promises'

export class ChangelogGenerator {
  public async generate(file: string, notes: string, title?: string): Promise<void> {
    let oldContent = ''
    try {
      oldContent = await fs.readFile(file, 'utf8')
    } catch (err) {
      // If a file does not exist, just use empty string
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }

    // write a file effectively: write several strings, avoid concatenation
    const stream = await fs.open(file, 'w')
    if (title) {
      await stream.write(title + '\n\n')
    }

    notes = notes.replace(/\n{3,}/, '\n\n') // remove leading newlines
    await stream.write(notes.trim()) // notes come with 3 trailing newlines

    if (oldContent) {
      const minorStart = oldContent.search('(^|\n\n)# \\[')
      const patchStart = oldContent.search('(^|\n\n)## \\[')
      const changesStart = [minorStart, patchStart].filter(index => index !== -1).map(index => index == 0 ? 0 : index + 2)
      if (changesStart.length > 0) {
        oldContent = oldContent.substring(Math.min(...changesStart))
      }
      await stream.write('\n\n\n')
      await stream.write(oldContent)
    }

    await stream.close()
  }
}
