import fs from 'fs/promises'

export class ChangelogGenerator {
  public async generate(file: string, notes: string, title?: string): Promise<void> {
    title = title ? title + '\n\n' : ''

    let oldContent = ''
    try {
      oldContent = await fs.readFile(file, 'utf8')
    } catch (err) {
      // If a file does not exist, just use empty string
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    const minorStart = oldContent.indexOf('\n\n# [')
    const patchStart = oldContent.indexOf('\n\n## [')
    const changesStart = [minorStart, patchStart].filter(index => index !== -1)
    if (changesStart.length > 0) {
      oldContent = oldContent.substring(Math.min(...changesStart)).trim()
    }

    await fs.writeFile(file, title + notes + oldContent)
  }
}
