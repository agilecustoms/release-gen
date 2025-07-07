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
        oldContent = '\n\n' + oldContent;
        const minorStart = oldContent.indexOf('\n\n# [');
        const patchStart = oldContent.indexOf('\n\n## [');
        const changesStart = [minorStart, patchStart].filter(index => index !== -1);
        if (changesStart.length > 0) {
            oldContent = oldContent.substring(Math.min(...changesStart)).trim();
        }
        await fs.writeFile(file, title + notes + oldContent);
    }
}
