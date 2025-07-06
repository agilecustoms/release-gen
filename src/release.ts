import fs from 'fs/promises'
import type { NextRelease, Options, Result } from 'semantic-release'
import semanticRelease from 'semantic-release'

export type ReleaseOptions = {
  changelogFile?: string
  changelogTitle?: string
  tagFormat: string
}

export type Release = {
  nextVersion: string
  notes: string
}

/**
 * default plugins:
 * "@semantic-release/commit-analyzer"
 * "@semantic-release/release-notes-generator"
 * "@semantic-release/npm"
 * "@semantic-release/github" - creates a GitHub release
 * <br>
 * I need only first two, so specify them explicitly
 */
const plugins = [
  '@semantic-release/commit-analyzer', // https://github.com/semantic-release/commit-analyzer
  '@semantic-release/release-notes-generator', // https://github.com/semantic-release/release-notes-generator
]

export const release = async (options: ReleaseOptions): Promise<Release | false> => {
  const opts: Options = {
    dryRun: true,
    tagFormat: options.tagFormat,
    plugins
  }
  let result: Result
  try {
    result = await semanticRelease(opts)
  } catch (e) {
    // @ts-expect-error do not know how to overcome this TS compilation error
    if (e.command.startsWith('git fetch --tags')) {
      throw new Error('git fetch --tags failed. Run `git fetch --tags --force` manually to update the tags.', { cause: e })
    }
    throw e
  }

  if (!result) {
    return false
  }

  const nextRelease: NextRelease = result.nextRelease
  const version = nextRelease.gitTag
  if (!version) {
    throw new Error('No version found in the next release. This is unexpected')
  }

  const notes = nextRelease.notes
  if (!notes) {
    throw new Error('No release notes found in the next release. This is unexpected')
  }

  if (options.changelogFile) {
    const title = options.changelogTitle ? options.changelogTitle + '\n\n' : ''

    let oldContent = ''
    try {
      oldContent = await fs.readFile(options.changelogFile, 'utf8')
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

    await fs.writeFile(options.changelogFile, title + notes + oldContent)
  }

  return {
    nextVersion: version,
    notes
  }
}
