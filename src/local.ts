import { release, type ReleaseOptions } from './release.js'

const options: ReleaseOptions = {
  changelogFile: 'CHANGELOG.md',
  changelogTitle: '# Changelog',
  tagFormat: 'v${version}',
}
const res = await release(options)

if (!res) {
  console.log('No new release found')
  process.exit(0)
}

console.log('outputs.next_version:', res.nextVersion)
