import esmock from 'esmock';
const allowedPlugins = [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
];
const defaultPlugins = [
    '@semantic-release/npm',
    '@semantic-release/github',
];
export class SemanticReleaseAdapter {
    async run(opts, config) {
        const pluginsPath = 'semantic-release/lib/plugins/index.js';
        const getConfigPath = 'semantic-release/lib/get-config.js';
        const currentBranch = opts['currentBranch'];
        let prerelease = false;
        let minorMaintenance = false;
        const originalPluginsFunc = (await import(pluginsPath)).default;
        const getConfig = await esmock(getConfigPath, {
            [pluginsPath]: {
                default: async (context, pluginsPath) => {
                    const options = context.options;
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
        return result ? { ...result, prerelease, minorMaintenance } : result;
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
        return /\d+\.\d+\.x/.test(range);
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
}
