import * as core from '@actions/core'
import { ExitCode } from '@actions/core'
import { ReleaseGenerator } from './ReleaseGenerator'

const branchName = process.env.GITHUB_REF_NAME as string

const releaseGenerator = new ReleaseGenerator()

releaseGenerator.generate(branchName)
  .then(() => core.info('Upload completed'))
  .catch((error) => {
    core.error('Release generation failed.')
    core.error(error)
    process.exitCode = ExitCode.Failure
  })
