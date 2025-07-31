import type { Result } from 'semantic-release'

export type ReleaseOptions = {
  branchName: string
  changelogFile?: string
  changelogTitle?: string
  cwd: string
  releaseBranches?: string
  releasePlugins?: string
  tagFormat?: string
}

export type ReleaseDetails = {
  channel?: string
  gitTags: string[]
  prerelease: boolean
}

export type SemanticReleaseResult = false | Result & ReleaseDetails
