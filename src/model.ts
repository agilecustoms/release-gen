import type { BranchObject, Result } from 'semantic-release'

export type ReleaseOptions = {
  changelogFile?: string
  changelogTitle?: string
  cwd: string
  defaultMinor: boolean
  releaseBranches?: string
  releasePlugins?: string
  tagFormat?: string
}

export type SemanticReleaseResult = false | Result & { branch: BranchObject }

export type ReleaseDetails = {
  channel: string
  gitTags: string[]
  notes: string
  prerelease: boolean
  tags: string[]
  version: string
}
