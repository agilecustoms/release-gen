import { ChangelogGenerator } from './service/ChangelogGenerator.js';
import { ReleaseProcessor } from './service/ReleaseProcessor.js';
const changelogGenerator = new ChangelogGenerator();
const releaseProcessor = new ReleaseProcessor(changelogGenerator);
const options = {
    changelogFile: 'CHANGELOG.md',
    changelogTitle: '# Changelog',
    tagFormat: 'v${version}',
};
const res = await releaseProcessor.process(options);
if (!res) {
    console.log('No new release found');
    process.exit(0);
}
console.log('outputs.next_version:', res.nextVersion);
