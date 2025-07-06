import type { NextRelease, Options, Result } from 'semantic-release'
import semanticRelease from 'semantic-release'

export type ReleaseOptions = {
  changelogPath?: string
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
  if (options.changelogPath) {
    plugins.push(
      '@semantic-release/changelog'
    )
    opts['changelogFile'] = options.changelogPath
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
  return {
    nextVersion: version,
    notes: nextRelease.notes || ''
  }
}
