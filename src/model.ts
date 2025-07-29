import type { NextRelease, Result } from 'semantic-release'

export type ReleaseOptions = {
  branchName: string
  changelogFile?: string
  changelogTitle?: string
  cwd: string
  releaseBranches?: string
  releasePlugins?: string
  tagFormat?: string
}

export type SemanticReleaseResult = false | Result & {
  prerelease: boolean
}

export type TheNextRelease = NextRelease & {
  prerelease: boolean
}
