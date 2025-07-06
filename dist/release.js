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
    let notes = nextRelease.notes;
    if (!notes) {
        throw new Error('No release notes found in the next release. This is unexpected');
    }
    if (options.changelogFile) {
        let oldContent = '';
        try {
            oldContent = await fs.readFile(options.changelogFile, 'utf8');
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
        if (options.changelogTitle) {
            if (oldContent.startsWith(options.changelogTitle)) {
                oldContent = oldContent.slice(options.changelogTitle.length).trim();
                oldContent.substring(options.changelogTitle.length);
            }
            notes = `${options.changelogTitle}\n\n${notes}`;
        }
        await fs.writeFile(options.changelogFile, notes + oldContent);
    }
    return {
        nextVersion: version,
        notes
    };
};
