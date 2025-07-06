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

  let notes = nextRelease.notes
  if (!notes) {
    throw new Error('No release notes found in the next release. This is unexpected')
  }

  if (options.changelogFile) {
    let oldContent = ''
    try {
      oldContent = await fs.readFile(options.changelogFile, 'utf8')
    } catch (err) {
      // If a file does not exist, just use empty string
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    if (options.changelogTitle) {
      if (oldContent.startsWith(options.changelogTitle)) {
        // If the file starts with the title, remove it
        oldContent = oldContent.slice(options.changelogTitle.length).trim()
        oldContent.substring(options.changelogTitle.length)
      }
      notes = `${options.changelogTitle}\n\n${notes}`
    }
    await fs.writeFile(options.changelogFile, notes + oldContent)
  }

  return {
    nextVersion: version,
    notes
  }
}
