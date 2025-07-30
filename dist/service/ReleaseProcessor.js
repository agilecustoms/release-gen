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
        const notes = nextRelease.notes;
        if (!notes) {
            throw new Error('No release notes found in the next release. This is unexpected');
        }
        if (options.changelogFile) {
            await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle);
        }
        return {
            ...nextRelease,
            gitTags: this.getGitTags(nextRelease.gitTag, result.prerelease),
            prerelease: result.prerelease
        };
    }
    async semanticRelease(options) {
        const opts = {
            dryRun: true
        };
        opts['currentBranch'] = options.branchName;
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
            cwd: options.cwd
        };
        return await this.semanticReleaseAdapter.run(opts, config);
    }
    getGitTags(tag, prerelease) {
        if (prerelease) {
            return [tag];
        }
        const minor = tag.slice(0, tag.lastIndexOf('.'));
        const major = minor.slice(0, minor.lastIndexOf('.'));
        return [tag, minor, major];
    }
}
