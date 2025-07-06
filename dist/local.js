import { release } from './release.js';
const options = {
    changelogFile: 'CHANGELOG.md',
    changelogTitle: '# Changelog\n\nAll notable changes to this project will be documented in this file.',
    tagFormat: 'v${version}',
};
const res = await release(options);
if (!res) {
    console.log('No new release found');
    process.exit(0);
}
console.log('outputs.next_version:', res.nextVersion);
