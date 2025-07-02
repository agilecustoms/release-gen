import semanticRelease from 'semantic-release';
export const release = async (options) => {
    const plugins = [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
    ];
    const opts = {
        dryRun: true,
        tagFormat: options.tagFormat,
        plugins
    };
    if (options.changelogPath) {
        plugins.push('@semantic-release/changelog');
        opts['changelogFile'] = options.changelogPath;
    }
    let result;
    try {
        result = await semanticRelease(opts);
    }
    catch (e) {
        if (e.command.startsWith('git fetch --tags')) {
            throw new Error('git fetch --tags failed. Run `git fetch --tags --force` manually to update the tags.', { cause: e });
        }
        throw e;
    }
    if (!result) {
        return false;
    }
    const nextRelease = result.nextRelease;
    const version = nextRelease.gitTag;
    return {
        nextVersion: version,
        notes: nextRelease.notes || ''
    };
};
