import semanticRelease from 'semantic-release';
const plugins = [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
];
export class ReleaseProcessor {
    changelogGenerator;
    constructor(changelogGenerator) {
        this.changelogGenerator = changelogGenerator;
    }
    async process(options) {
        const result = await this.semanticRelease(options.tagFormat);
        if (!result) {
            return false;
        }
        const nextRelease = result.nextRelease;
        const version = nextRelease.gitTag;
        if (!version) {
            throw new Error('No version found in the next release. This is unexpected');
        }
        const notes = nextRelease.notes;
        if (!notes) {
            throw new Error('No release notes found in the next release. This is unexpected');
        }
        if (options.changelogFile) {
            await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle);
        }
        return {
            nextVersion: version,
            notes
        };
    }
    async semanticRelease(tagFormat) {
        const opts = {
            dryRun: true,
            tagFormat,
            plugins
        };
        try {
            return await semanticRelease(opts);
        }
        catch (e) {
            if (e.command.startsWith('git fetch --tags')) {
                throw new Error('git fetch --tags failed. Run `git fetch --tags --force` manually to update the tags.', { cause: e });
            }
            throw e;
        }
    }
}
