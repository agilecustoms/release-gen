export const release = async () => {
    const semanticRelease = await import('semantic-release');
    const options = {
        dryRun: true,
        plugins: [
            '@semantic-release/commit-analyzer',
            '@semantic-release/release-notes-generator',
        ]
    };
    let result;
    try {
        result = await semanticRelease.default(options);
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
    const version = nextRelease.version;
    return {
        nextVersion: version,
        notes: nextRelease.notes || ''
    };
};
