import type { BranchObject, BranchSpec, PluginSpec, Result } from 'semantic-release'

export const VALID_VERSION_BUMPS = ['', 'default-minor', 'default-patch'] as const
export type VersionBump = typeof VALID_VERSION_BUMPS[number]

export type ReleaseOptions = {
  changelogFile?: string
  changelogTitle?: string
  floatingTags: boolean
  cwd: string
  notesTmpFile: string
  releaseBranches?: string
  branches?: BranchSpec[] | BranchSpec // parsed 'releaseBranches'
  releaseChannel?: string | false
  releasePlugins?: string
  plugins?: PluginSpec[] // parsed 'releasePlugins'
  tagFormat?: string
  version?: string
  versionBump: VersionBump
}

export type SemanticReleaseResult = false | (Result & { branch: BranchObject })

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
