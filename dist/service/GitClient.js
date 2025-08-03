import fs from 'node:fs';
import { exec } from '../utils.js';
export class GitClient {
    async commit() {
        const options = { stdio: 'inherit' };
        await fs.promises.writeFile(`./release-gen`, '');
        await exec('git add ./release-gen', options);
        await exec(`git commit -m "feat: synthetic"`, options);
    }
    async revert() {
        const options = { stdio: 'inherit' };
        await exec('git reset --hard head^1', options);
    }
}
