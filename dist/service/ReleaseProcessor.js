import process from 'node:process';
const MAINTENANCE_BRANCH = /\d+\.x\.x/;
const MINOR_MAINTENANCE_BRANCH = /\d+\.\d+\.x/;
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
        const notes = result.nextRelease.notes;
        if (!notes) {
            throw new Error('No release notes found in the next release. This is unexpected');
        }
        if (options.changelogFile) {
            await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle);
        }
        const branch = result.branch;
        let channel = branch.channel;
        if (branch.prerelease) {
            if (!channel || channel.trim() === '') {
                channel = branch.name;
            }
        }
        else if (channel === undefined) {
            const maintenance = branch.range || MINOR_MAINTENANCE_BRANCH.test(branch.name) || MAINTENANCE_BRANCH.test(branch.name);
            if (!maintenance) {
                channel = 'latest';
            }
        }
        const version = result.nextRelease.gitTag;
        const tags = this.getTags(version, branch);
        const gitTags = [...tags];
        if (channel && channel !== branch.name) {
            gitTags.push(channel);
        }
        if (branch.prerelease) {
            if (branch.channel) {
                tags.push(branch.channel);
            }
        }
        else if (channel) {
            tags.push(channel);
        }
        return {
            channel: channel || undefined,
            gitTags,
            notes: notes,
            prerelease: Boolean(branch.prerelease),
            tags,
            version
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
    getTags(version, branch) {
        const tags = [version];
        if (!branch.prerelease) {
            const minor = version.slice(0, version.lastIndexOf('.'));
            tags.push(minor);
            const range = branch.range || branch.name;
            const minorMaintenance = MINOR_MAINTENANCE_BRANCH.test(range);
            if (!minorMaintenance) {
                const major = minor.slice(0, minor.lastIndexOf('.'));
                tags.push(major);
            }
        }
        return tags;
    }
}
