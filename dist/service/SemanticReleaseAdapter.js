import esmock from 'esmock';
import { ReleaseError } from '../model.js';
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
        const gitPath = 'semantic-release/lib/git.js';
        const currentBranch = opts['currentBranch'];
        let branch = { name: currentBranch };
        const originalPluginsFunc = (await import(pluginsPath)).default;
        const getConfig = await esmock(getConfigPath, {
            [pluginsPath]: {
                default: async (context, pluginsPath) => {
                    const options = context.options;
                    branch = this.findBranch(options.branches, currentBranch);
                    options.plugins = this.fixPlugins(options.plugins);
                    return await originalPluginsFunc(context, pluginsPath);
                }
            }
        });
        const semanticRelease = await esmock('semantic-release/index.js', {
            [getConfigPath]: {
                default: async (context, cliOptions) => {
                    return await getConfig(context, cliOptions);
                },
            },
            [gitPath]: {
                verifyAuth: async (_, __, ___) => {
                },
            }
        });
        const result = await semanticRelease(opts, config);
        if (!result) {
            return false;
        }
        return { ...result, branch };
    }
    findBranch(branches, branch) {
        for (const spec of branches) {
            if (spec === branch) {
                return { name: branch };
            }
            if (typeof spec === 'object' && spec.name === branch) {
                return { ...spec };
            }
        }
        throw new ReleaseError(`Branch "${branch}" not found in branches: ${JSON.stringify(branches)}`);
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
