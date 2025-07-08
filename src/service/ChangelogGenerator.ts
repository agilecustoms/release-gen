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
    const minorStart = oldContent.search('(^|[^#])# \\[')
    const patchStart = oldContent.indexOf('## [')
    const changesStart = [minorStart, patchStart].filter(index => index !== -1)
    if (changesStart.length > 0) {
      oldContent = oldContent.substring(Math.min(...changesStart)).trim()
    }

    // write file effectively: write several strings, avoid concatenation
    const stream = await fs.open(file, 'w')
    if (title) {
      await stream.write(title + '\n\n')
    }
    await stream.write(notes)
    if (oldContent) {
      await stream.write('\n\n')
      await stream.write(oldContent)
    }
    await stream.close()
  }
}
