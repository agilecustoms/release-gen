import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    ghActionDir: string
    originDir: string
    tmpDir: string
  }
}

const rootDir = path.resolve(__dirname, '../..')

/**
 * Runs once before all integration tests:
 * 1. builds release-gen into a temp 'gh-action' dir and installs prod dependencies there (like GitHub does for an action)
 * 2. creates a local bare 'origin' repo with branches and tags that tests release from
 */
export default function setup(project: TestProject): () => void {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-gen-it-'))

  const ghActionDir = path.join(tmpDir, 'gh-action')
  buildGhAction(ghActionDir)

  const originDir = path.join(tmpDir, 'origin.git')
  createOrigin(originDir, path.join(tmpDir, 'origin-work'))

  project.provide('ghActionDir', ghActionDir)
  project.provide('originDir', originDir)
  project.provide('tmpDir', tmpDir)

  return () => fs.rmSync(tmpDir, { recursive: true, force: true })
}

function buildGhAction(ghActionDir: string): void {
  execSync(`npx tsc --outDir "${path.join(ghActionDir, 'dist')}"`, { cwd: rootDir, stdio: 'inherit' })
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(ghActionDir, 'package.json'))
  fs.copyFileSync(path.join(rootDir, 'package-lock.json'), path.join(ghActionDir, 'package-lock.json'))
  // dist/index.js runs 'npm ci' only if there are no node_modules yet, so install them once for all tests
  execSync('npm ci --omit=dev --loglevel=error --no-audit --no-fund --no-progress', { cwd: ghActionDir, stdio: 'inherit' })
}

/**
 * Branches and their latest tags (see test/branches.md):
 * - int-test050: v0.5.0
 * - main: v4.0.0 (also has v1.1.1, v2.0.0, v3.1.2)
 * - 1.x.x: v1.3.0 (forked from main at v1.1.1)
 * - 1.2.x: v1.2.1 (forked from 1.x.x at v1.2.0)
 * - test-next: v3.1.2 (forked from main at v3.1.2)
 */
function createOrigin(originDir: string, workDir: string): void {
  const git = (cmd: string): void => {
    execSync(`git ${cmd}`, { cwd: workDir, stdio: 'pipe' })
  }
  const commit = (msg: string, tag?: string): void => {
    git(`commit -q --allow-empty -m "${msg}"`)
    if (tag) git(`tag ${tag}`)
  }

  fs.mkdirSync(workDir)
  git('init -q -b main')
  git('config user.name "CI User"')
  git('config user.email "ci@example.com"')
  git('config commit.gpgsign false')
  git('config tag.gpgsign false')
  commit('chore: init')

  git('checkout -q -b int-test050')
  commit('feat: int-test050', 'v0.5.0')

  git('checkout -q main')
  commit('feat: v1.1.1', 'v1.1.1')

  git('checkout -q -b 1.x.x')
  commit('feat: v1.2.0', 'v1.2.0')
  git('checkout -q -b 1.2.x')
  commit('fix: test minor maintenance', 'v1.2.1')
  git('checkout -q 1.x.x')
  commit('feat: test minor release', 'v1.3.0')

  git('checkout -q main')
  commit('feat!: v2.0.0', 'v2.0.0')
  commit('feat!: v3.1.2', 'v3.1.2')
  git('branch test-next')
  commit('feat!: v4.0.0', 'v4.0.0')

  execSync(`git init -q --bare -b main "${originDir}"`)
  git(`push -q --all "${originDir}"`)
  git(`push -q --tags "${originDir}"`)
  fs.rmSync(workDir, { recursive: true, force: true })
}
