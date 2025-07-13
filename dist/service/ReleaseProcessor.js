import process from 'node:process';
import esmock from "esmock";
const plugins = [
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
            branches: ['main', 'master'],
            dryRun: true,
            tagFormat,
            plugins
        };
        if (process.env.REPOSITORY_URL) {
            opts.repositoryUrl = process.env.REPOSITORY_URL;
        }
        const config = {
            cwd: process.env.GITHUB_WORKSPACE
        };
        const real = (await import('semantic-release/lib/get-config.js')).default;
        console.log('typeof real:', typeof real);
        const semanticRelease = await esmock('semantic-release', {
            'semantic-release/lib/get-config.js': {
                default: async (context, cliOptions) => {
                    console.log('Victory4');
                    const config = await real(context, cliOptions);
                    return config;
                },
            },
        });
        return await semanticRelease(opts, config);
    }
}
