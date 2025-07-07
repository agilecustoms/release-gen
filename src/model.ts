export type ReleaseOptions = {
  changelogFile?: string
  changelogTitle?: string
  tagFormat: string
}

export type Release = {
  nextVersion: string
  notes: string
}
