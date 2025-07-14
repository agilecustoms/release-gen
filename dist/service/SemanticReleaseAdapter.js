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
        const originalPluginsFunc = (await import(pluginsPath)).default;
        const getConfig = await esmock(getConfigPath, {
            [pluginsPath]: {
                default: async (context, pluginsPath) => {
                    context.options.plugins = this.fixPlugins(context.options.plugins);
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
        return await semanticRelease(opts, config);
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
