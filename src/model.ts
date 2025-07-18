export type ReleaseOptions = {
  changelogFile?: string
  changelogTitle?: string
  releaseBranches?: string
  releasePlugins?: string
  tagFormat?: string
}

export type Release = {
  nextVersion: string
  notes: string
}
