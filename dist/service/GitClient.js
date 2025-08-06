import fs from 'node:fs';
import { exec } from '../utils.js';
export class GitClient {
    async commit(type) {
        const options = { stdio: 'inherit' };
        await fs.promises.writeFile(`./release-gen`, '');
        await exec('git add ./release-gen', options);
        await exec(`git commit -m "${type}: synthetic"`, options);
    }
    async revert() {
        const options = { stdio: 'inherit' };
        await exec('git reset --hard HEAD~1', options);
    }
}
