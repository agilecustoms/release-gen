import esmock from 'esmock';
const allowedPlugins = [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
];
const defaultPlugins = [
    '@semantic-release/npm',
    '@semantic-release/github',
];
const MAINTENANCE_BRANCH = /\d+\.\d+\.x/;
const MINOR_MAINTENANCE_BRANCH = /\d+\.x\.x/;
function isMaintenance(branch) {
    return MAINTENANCE_BRANCH.test(branch) || MINOR_MAINTENANCE_BRANCH.test(branch);
}
export class SemanticReleaseAdapter {
    async run(opts, config) {
        const pluginsPath = 'semantic-release/lib/plugins/index.js';
        const getConfigPath = 'semantic-release/lib/get-config.js';
        const currentBranch = opts['currentBranch'];
        let channel;
        let prerelease = false;
        let minorMaintenance = false;
        const originalPluginsFunc = (await import(pluginsPath)).default;
        const getConfig = await esmock(getConfigPath, {
            [pluginsPath]: {
                default: async (context, pluginsPath) => {
                    const options = context.options;
                    channel = this.getChannel(options.branches, currentBranch);
                    prerelease = this.isPrerelease(options.branches, currentBranch);
                    if (!prerelease) {
                        minorMaintenance = this.isMinorMaintenance(options.branches, currentBranch);
                    }
                    options.plugins = this.fixPlugins(options.plugins);
                    return await originalPluginsFunc(context, pluginsPath);
                }
            }
        });
        const semanticRelease = await esmock('semantic-release', {
            [getConfigPath]: {
                default: async (context, cliOptions) => {
                    return await getConfig(context, cliOptions);
                },
            },
        });
        const result = await semanticRelease(opts, config);
        if (!result) {
            return false;
        }
        const tag = result.nextRelease.gitTag;
        const gitTags = this.getGitTags(tag, prerelease, minorMaintenance);
        return { ...result, channel, prerelease, gitTags };
    }
    getChannel(branches, branch) {
        for (const spec of branches) {
            if (spec === branch) {
                return isMaintenance(branch) ? undefined : 'latest';
            }
            if (typeof spec === 'object' && spec.name === branch) {
                if (spec.prerelease) {
                    return spec.channel || branch;
                }
                if ('channel' in spec) {
                    return spec.channel || undefined;
                }
                if (spec.range) {
                    return undefined;
                }
                return 'latest';
            }
        }
    }
    isPrerelease(branches, branch) {
        return branches.some((branchSpec) => {
            return typeof branchSpec === 'object' && branchSpec.name === branch && branchSpec.prerelease === true;
        });
    }
    isMinorMaintenance(branches, branch) {
        let range = '';
        for (const spec of branches) {
            if (spec === branch) {
                range = branch;
                break;
            }
            if (typeof spec === 'object' && spec.name === branch) {
                range = spec.range || spec.name;
                break;
            }
        }
        return MAINTENANCE_BRANCH.test(range);
    }
    fixPlugins(plugins) {
        return plugins.filter((plugin) => {
            const name = typeof plugin === 'string' ? plugin : plugin[0];
            if (allowedPlugins.includes(name)) {
                return true;
            }
            if (!defaultPlugins.includes(name)) {
                console.warn(`Plugin "${name}" is not supported by in "release-gen" action, skipping it`);
            }
            return false;
        });
    }
    getGitTags(tag, prerelease, minorMaintenance) {
        if (prerelease) {
            return [tag];
        }
        const minor = tag.slice(0, tag.lastIndexOf('.'));
        if (minorMaintenance) {
            return [tag, minor];
        }
        const major = minor.slice(0, minor.lastIndexOf('.'));
        return [tag, minor, major];
    }
}
