import fs from 'node:fs/promises';
import process from 'node:process';
import { ReleaseError } from '../model.js';
import { exec } from '../utils.js';
const MAINTENANCE_BRANCH = /\d+\.x\.x/;
const MINOR_MAINTENANCE_BRANCH = /\d+\.\d+\.x/;
const VERSION_BUMP_OPTIONS = ['default-minor', 'default-patch'];
export class ReleaseProcessor {
    semanticReleaseAdapter;
    changelogGenerator;
    gitClient;
    constructor(semanticReleaseAdapter, changelogGenerator, gitClient) {
        this.semanticReleaseAdapter = semanticReleaseAdapter;
        this.changelogGenerator = changelogGenerator;
        this.gitClient = gitClient;
    }
    async process(options) {
        const { stdout } = await exec('git rev-parse --abbrev-ref HEAD', { cwd: options.cwd });
        const currentBranch = stdout.trim();
        if (options.version) {
            return this.explicitVersion(options, currentBranch);
        }
        if (options.versionBump && !VERSION_BUMP_OPTIONS.includes(options.versionBump)) {
            throw new ReleaseError(`Invalid version-bump option: ${options.versionBump}. Valid options are: ${VERSION_BUMP_OPTIONS.join(', ')}`);
        }
        let result;
        try {
            result = await this.semanticRelease(options, currentBranch);
        }
        catch (e) {
            this.handleError(e);
            throw e;
        }
        let notesTmpFile = options.notesTmpFile;
        let notes = undefined;
        if (result) {
            notes = result.nextRelease.notes;
            if (!result.nextRelease.notes) {
                throw new ReleaseError('No release notes found in the next release. This is unexpected');
            }
        }
        else {
            if (!options.versionBump) {
                throw new ReleaseError('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)');
            }
            const commitType = options.versionBump === 'default-minor' ? 'feat' : 'fix';
            try {
                await this.gitClient.commit(commitType);
                result = await this.semanticRelease(options, currentBranch);
                if (!result) {
                    throw new ReleaseError('Unable to generate new version even with "version-bump", could be present that doesn\'t respect feat: prefix');
                }
            }
            finally {
                await this.gitClient.revert();
            }
        }
        if (notes) {
            if (options.changelogFile) {
                await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle);
            }
            await fs.writeFile(notesTmpFile, notes, 'utf8');
        }
        else {
            notesTmpFile = '';
        }
        const branch = result.branch;
        if (branch.channel && result.nextRelease.channel) {
            branch.channel = result.nextRelease.channel;
        }
        let channel = branch.channel;
        if (!channel || channel.trim() === '') {
            const maintenance = branch.range || MINOR_MAINTENANCE_BRANCH.test(branch.name) || MAINTENANCE_BRANCH.test(branch.name);
            channel = branch.prerelease || maintenance ? branch.name : 'latest';
        }
        const version = result.nextRelease.gitTag;
        const tags = [version];
        const gitTags = [version];
        if (options.floatingTags) {
            this.addTags(tags, gitTags, version, branch);
            if ((branch.channel || branch.channel === undefined) && channel !== branch.name) {
                gitTags.push(channel);
            }
            if (branch.channel || (branch.channel === undefined && channel === 'latest')) {
                tags.push(channel);
            }
        }
        return {
            channel,
            gitTags,
            notesTmpFile,
            prerelease: Boolean(branch.prerelease),
            tags,
            version
        };
    }
    explicitVersion(options, currentBranch) {
        let channel = options.releaseChannel;
        if (channel === false) {
            channel = currentBranch;
        }
        else if (!channel) {
            channel = 'latest';
        }
        const version = options.version;
        const tags = [version];
        const gitTags = [version];
        if (options.floatingTags) {
            let tag = version;
            for (let lastDotIndex; (lastDotIndex = tag.lastIndexOf('.')) !== -1;) {
                tag = tag.slice(0, lastDotIndex);
                tags.push(tag);
                gitTags.push(tag);
            }
            if (options.releaseChannel !== false) {
                tags.push(channel);
                if (channel !== currentBranch) {
                    gitTags.push(channel);
                }
            }
        }
        return {
            channel,
            gitTags,
            notesTmpFile: '',
            prerelease: false,
            tags,
            version
        };
    }
    handleError(e) {
        if (!(e instanceof Error)) {
            return;
        }
        if ('code' in e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                throw new ReleaseError(`You're using non default preset, please specify corresponding npm package in npm-extra-deps input. Details: ${e.message}`);
            }
            if (e.code === 'EGITNOPERMISSION') {
                throw new ReleaseError('Not enough permission to push to remote repo. When release from protected branch, '
                    + 'you need PAT token issued by person with permission to bypass branch protection rules');
            }
        }
        if (e.message.includes('Invalid `tagFormat` option')) {
            throw new ReleaseError('Invalid tag format (tag-format input or tagFormat in .releaserc.json)');
        }
    }
    async semanticRelease(options, currentBranch) {
        const opts = {
            dryRun: true
        };
        opts['currentBranch'] = currentBranch;
        if (options.tagFormat) {
            opts.tagFormat = options.tagFormat;
        }
        if (options.releaseBranches) {
            try {
                opts.branches = JSON.parse(options.releaseBranches);
            }
            catch (cause) {
                throw new ReleaseError(`Failed to parse releaseBranches: ${options.releaseBranches}`, { cause });
            }
        }
        if (options.releasePlugins) {
            try {
                opts.plugins = JSON.parse(options.releasePlugins);
            }
            catch (cause) {
                throw new ReleaseError(`Failed to parse releasePlugins: ${options.releasePlugins}`, { cause });
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
    addTags(tags, gitTags, version, branch) {
        if (!branch.prerelease) {
            const minor = version.slice(0, version.lastIndexOf('.'));
            tags.push(minor);
            gitTags.push(minor);
            const range = branch.range || branch.name;
            const minorMaintenance = MINOR_MAINTENANCE_BRANCH.test(range);
            if (!minorMaintenance) {
                const major = minor.slice(0, minor.lastIndexOf('.'));
                tags.push(major);
                gitTags.push(major);
            }
        }
    }
}
