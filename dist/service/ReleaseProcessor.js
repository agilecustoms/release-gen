import fs from 'node:fs/promises';
import process from 'node:process';
import { exec } from '../utils.js';
const MAINTENANCE_BRANCH = /\d+\.x\.x/;
const MINOR_MAINTENANCE_BRANCH = /\d+\.\d+\.x/;
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
        let result;
        try {
            result = await this.semanticRelease(options);
        }
        catch (e) {
            if (e instanceof Error && 'code' in e && e.code === 'MODULE_NOT_FOUND') {
                throw new Error(`You're using non default preset, please specify corresponding npm package in npm-extra-deps input. Details: ${e.message}`, { cause: e });
            }
            throw e;
        }
        let notes = undefined;
        if (result) {
            notes = result.nextRelease.notes;
            if (!result.nextRelease.notes) {
                throw new Error('No release notes found in the next release. This is unexpected');
            }
        }
        else {
            if (!options.defaultMinor) {
                throw new Error('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)');
            }
            try {
                await this.gitClient.commit();
                result = await this.semanticRelease(options);
                if (!result) {
                    throw new Error('Unable to generate new version even with "default_minor: true", could be present that doesn\'t respect feat: prefix');
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
            await fs.writeFile(options.notesTmpFile, notes, 'utf8');
        }
        const branch = result.branch;
        let channel = branch.channel;
        if (!channel || channel.trim() === '') {
            const maintenance = branch.range || MINOR_MAINTENANCE_BRANCH.test(branch.name) || MAINTENANCE_BRANCH.test(branch.name);
            channel = branch.prerelease || maintenance ? branch.name : 'latest';
        }
        const version = result.nextRelease.gitTag;
        const tags = this.getTags(version, branch);
        const gitTags = [...tags];
        if ((branch.channel || branch.channel === undefined) && channel !== branch.name) {
            gitTags.push(channel);
        }
        if (branch.channel || (branch.channel === undefined && channel === 'latest')) {
            tags.push(channel);
        }
        return {
            channel,
            gitTags,
            prerelease: Boolean(branch.prerelease),
            tags,
            version
        };
    }
    async semanticRelease(options) {
        const opts = {
            dryRun: true
        };
        const { stdout } = await exec('git rev-parse --abbrev-ref HEAD', { cwd: options.cwd });
        opts['currentBranch'] = stdout.trim();
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
