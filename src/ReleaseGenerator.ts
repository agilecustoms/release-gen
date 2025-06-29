import fs from 'fs'
import semanticRelease, { type NextRelease, type Options, type Result } from 'semantic-release'

export class ReleaseGenerator {
  async generate(branch: string) {
    const options: Options = {
      branches: [branch],
      plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
      ],
      dryRun: true,
    }

    // const environment: Config = {
    //   cwd: process.cwd(),
    //   env: process.env,
    //   stdout: process.stdout,
    //   stderr: process.stderr,
    // };

    const result: Result = await semanticRelease(options)// , environment);
    if (!result) {
      throw 'Semantic Release did not return a result.'
    }
    const nextRelease: NextRelease = result.nextRelease
    fs.writeFileSync('next_version', nextRelease.version)
    if (nextRelease.notes) {
      fs.writeFileSync('release_notes', nextRelease.notes)
    }
  }
}
