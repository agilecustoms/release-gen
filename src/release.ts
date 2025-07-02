import type { NextRelease, Result } from 'semantic-release'
import semanticRelease from 'semantic-release'

export type Release = {
  nextVersion: string
  notes: string
}

export const release = async (): Promise<Release | false> => {
  const options = {
    dryRun: true,
    plugins: [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      // [
      //     '@semantic-release/changelog',
      //     {
      //         changelogFile: 'docs/CHANGELOG.md'
      //     }
      // ]
    ]
  }
  let result: Result
  try {
    result = await semanticRelease(options)
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
  const version = nextRelease.version
  return {
    nextVersion: version,
    notes: nextRelease.notes || ''
  }
}
