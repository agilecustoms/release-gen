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
        const stream = await fs.open(file, 'w');
        if (title) {
            await stream.write(title + '\n\n');
        }
        await stream.write(notes.trim());
        if (oldContent) {
            const minorStart = oldContent.search('(^|\n\n)# \\[');
            const patchStart = oldContent.search('(^|\n\n)## \\[');
            const changesStart = [minorStart, patchStart].filter(index => index !== -1).map(index => index == 0 ? 0 : index + 2);
            if (changesStart.length > 0) {
                oldContent = oldContent.substring(Math.min(...changesStart));
            }
            await stream.write('\n\n');
            await stream.write(oldContent);
        }
        await stream.close();
    }
}
