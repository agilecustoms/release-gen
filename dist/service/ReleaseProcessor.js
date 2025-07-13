import process from 'node:process';
import esmock from 'esmock';
const allowedPlugins = [
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
            tagFormat
        };
        if (process.env.REPOSITORY_URL) {
            opts.repositoryUrl = process.env.REPOSITORY_URL;
        }
        const config = {
            cwd: process.env.GITHUB_WORKSPACE
        };
        const pluginsPath = 'semantic-release/lib/plugins/index.js';
        const getConfigPath = 'semantic-release/lib/get-config.js';
        const originalPluginsFunc = (await import(pluginsPath)).default;
        const getConfig = await esmock(getConfigPath, {
            [pluginsPath]: {
                default: async (context, pluginsPath) => {
                    context.options.plugins = this.fixPlugins(context.options.plugins);
                    console.log('Using plugins: ' + JSON.stringify(context.options.plugins));
                    return await originalPluginsFunc(context, pluginsPath);
                }
            }
        });
        const semanticRelease = await esmock('semantic-release', {
            [getConfigPath]: {
                default: async (context, cliOptions) => {
                    const config = await getConfig(context, cliOptions);
                    return this.fixConfig(config);
                },
            },
        });
        return await semanticRelease(opts, config);
    }
    fixPlugins(plugins) {
        return plugins.filter((plugin) => {
            const name = typeof plugin === 'string' ? plugin : plugin[0];
            return allowedPlugins.includes(name);
        });
    }
    fixConfig(config) {
        return config;
    }
}
