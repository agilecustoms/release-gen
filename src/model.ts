import type { Options } from 'semantic-release'

export type ReleaseOptions = {
  changelogFile?: string
  changelogTitle?: string
  tagFormat: string
}

export type Release = {
  nextVersion: string
  notes: string
}

export type GetConfigResult = {
  options: Options
  plugins: object
}
