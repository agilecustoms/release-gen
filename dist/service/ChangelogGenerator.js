import fs from 'fs/promises';
export class ChangelogGenerator {
    async generate(file, notes, title) {
        let oldContent = '';
        try {
            oldContent = await fs.readFile(file, 'utf8');
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
        const minorStart = oldContent.search('(^|[^#])# \\[');
        const patchStart = oldContent.indexOf('## [');
        const changesStart = [minorStart, patchStart].filter(index => index !== -1);
        if (changesStart.length > 0) {
            oldContent = oldContent.substring(Math.min(...changesStart)).trim();
        }
        const stream = await fs.open(file, 'w');
        if (title) {
            await stream.write(title + '\n\n');
        }
        await stream.write(notes);
        if (oldContent) {
            await stream.write('\n\n');
            await stream.write(oldContent);
        }
        await stream.close();
    }
}
