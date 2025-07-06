import fs from 'fs/promises';
import semanticRelease from 'semantic-release';
const plugins = [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
];
export const release = async (options) => {
    const opts = {
        dryRun: true,
        tagFormat: options.tagFormat,
        plugins
    };
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
    if (!version) {
        throw new Error('No version found in the next release. This is unexpected');
    }
    const notes = nextRelease.notes;
    if (!notes) {
        throw new Error('No release notes found in the next release. This is unexpected');
    }
    if (options.changelogFile) {
        const title = options.changelogTitle ? options.changelogTitle + '\n\n' : '';
        let oldContent = '';
        try {
            oldContent = await fs.readFile(options.changelogFile, 'utf8');
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
        const changesStart = oldContent.indexOf('## [');
        if (changesStart !== -1) {
            oldContent = oldContent.substring(changesStart).trim();
        }
        await fs.writeFile(options.changelogFile, title + notes + oldContent);
    }
    return {
        nextVersion: version,
        notes
    };
};
