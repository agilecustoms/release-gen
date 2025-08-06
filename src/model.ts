import type { BranchObject, Result } from 'semantic-release'

export type ReleaseOptions = {
  changelogFile?: string
  changelogTitle?: string
  cwd: string
  notesTmpFile: string
  releaseBranches?: string
  releasePlugins?: string
  tagFormat?: string
  versionBump: string //  '' | 'default-minor' | 'default-patch'
}

export type SemanticReleaseResult = false | Result & { branch: BranchObject }

export type ReleaseDetails = {
  channel: string
  gitTags: string[]
  notesTmpFile: string
  prerelease: boolean
  tags: string[]
  version: string
}

export class ReleaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'ReleaseError'
  }
}
