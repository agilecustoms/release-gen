// const semanticRelease = require('semantic-release')
// import fs from 'fs'
// import {default as semanticRelease} from 'semantic-release'
// import { type Options } from 'semantic-release'
// import semanticRelease, { type NextRelease, type Options, type Result } from 'semantic-release'

export class ReleaseGenerator {
  async generate(branch: string) {
    const semanticRelease = await import('semantic-release')

    const res = await semanticRelease.default({
      branches: [branch],
      dryRun: true
    })

    console.log(res)

    // const options: Options = {
    //   branches: [branch],
    //   plugins: [
    //     '@semantic-release/commit-analyzer',
    //     '@semantic-release/release-notes-generator',
    //   ],
    //   dryRun: true,
    // }
    // console.log(options)

    // const environment: Config = {
    //   cwd: process.cwd(),
    //   env: process.env,
    //   stdout: process.stdout,
    //   stderr: process.stderr,
    // };

    // const result: Result = await semanticRelease(options)// , environment);
    // if (!result) {
    //   throw 'Semantic Release did not return a result.'
    // }
    // const nextRelease: NextRelease = result.nextRelease
    // fs.writeFileSync('next_version', nextRelease.version)
    // if (nextRelease.notes) {
    //   fs.writeFileSync('release_notes', nextRelease.notes)
    // }
  }
}
