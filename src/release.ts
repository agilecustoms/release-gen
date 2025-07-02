import fs from 'fs'
import type { NextRelease, Result } from 'semantic-release'

export const release = async () => {
  const semanticRelease = await import('semantic-release')
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
    result = await semanticRelease.default(options)
  } catch (e) {
    // @ts-expect-error do not know how to overcome this TS compilation error
    if (e.command.startsWith('git fetch --tags')) {
      throw new Error('git fetch --tags failed. Run `git fetch --tags --force` manually to update the tags.', { cause: e })
    }
    throw e
  }

  if (result) {
    const nextRelease: NextRelease = result.nextRelease
    const version = nextRelease.version
    fs.writeFileSync('next_version', version, 'utf8')
  }
}
