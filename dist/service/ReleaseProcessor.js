import process from 'node:process';
export class ReleaseProcessor {
    semanticReleaseAdapter;
    changelogGenerator;
    constructor(semanticReleaseAdapter, changelogGenerator) {
        this.semanticReleaseAdapter = semanticReleaseAdapter;
        this.changelogGenerator = changelogGenerator;
    }
    async process(options) {
        const result = await this.semanticRelease(options);
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
    async semanticRelease(options) {
        const opts = {
            dryRun: true
        };
        if (options.tagFormat) {
            opts.tagFormat = options.tagFormat;
        }
        if (options.releaseBranches) {
            try {
                opts.branches = JSON.parse(options.releaseBranches);
            }
            catch (cause) {
                throw new Error(`Failed to parse releaseBranches: ${options.releaseBranches}`, { cause });
            }
        }
        if (options.releasePlugins) {
            try {
                opts.plugins = JSON.parse(options.releasePlugins);
            }
            catch (cause) {
                throw new Error(`Failed to parse releasePlugins: ${options.releasePlugins}`, { cause });
            }
        }
        if (process.env.REPOSITORY_URL) {
            opts.repositoryUrl = process.env.REPOSITORY_URL;
        }
        const config = {
            cwd: process.env.GITHUB_WORKSPACE
        };
        return await this.semanticReleaseAdapter.run(opts, config);
    }
}
