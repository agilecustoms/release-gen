import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, beforeEach, describe, it } from 'vitest'

const rootDir = path.resolve(__dirname, '../..')
const distDir = path.join(rootDir, 'dist')
const gitDir = path.join(__dirname, 'git')
const ghActionDir = path.join(__dirname, 'gh-action')
const ghActionDistDir = path.join(ghActionDir, 'dist')

describe('release-gen', () => {
  beforeAll(() => {
    // rebuild source code to reflect any changes while work on tests
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

    // copy entire release-gen/dist dir into test/integration/gh-action
    fs.rmSync(ghActionDir, { recursive: true, force: true }) // clean before copy
    fs.mkdirSync(ghActionDir, { recursive: true })
    execSync(`cp -R "${distDir}" "${ghActionDir}"`)
    // copy root package.json and package-lock.json into test/integration/gh-action
    execSync(`cp "${path.join(rootDir, 'package.json')}" "${ghActionDir}"`)
    execSync(`cp "${path.join(rootDir, 'package-lock.json')}" "${ghActionDir}"`)

    // create test/integration/git directory
    fs.mkdirSync(gitDir, { recursive: true })
  })

  beforeEach((ctx) => {
    const testDir = path.join(gitDir, ctx.task.name)
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('minor', async (ctx) => {
    // create a directory for this test and cd into it
    const testDir = path.join(gitDir, ctx.task.name)
    fs.mkdirSync(testDir, { recursive: true })
    // process.chdir(testDir)

    // clone remote repo into the test directory
    execSync('git clone https://github.com/agilecustoms/release-gen.git .', { cwd: testDir, stdio: 'inherit' });
    // must remove 'test' otherwise vitest recognize them as another set of tests
    // remove other dirs to have more neat test directory
    // (tried a more elegant solution with sparse checkout, but faced a problem that local copy is behind remote one)
    ['.github', 'dist', 'src', 'test'].forEach((dir) => {
      const dirPath = path.join(testDir, dir)
      fs.rmSync(dirPath, { recursive: true, force: true })
    })
    // w/o user.name and user.email git will fail to commit on CI
    execSync('git config user.name "CI User"', { cwd: testDir, stdio: 'inherit' })
    execSync('git config user.email "ci@example.com"', { cwd: testDir, stdio: 'inherit' })
    // Make simple change and commit
    // fs.writeFileSync(`${testDir}/test.txt`, 'test content', 'utf8')
    execSync('git add .', { cwd: testDir, stdio: 'inherit' })
    execSync('git commit -m "fix: delete all dirs"', { cwd: testDir, stdio: 'inherit' })

    // launch release-gen/test/integration/gh-action/dist/index.js with env variable for tag-format
    const indexJs = path.join(ghActionDistDir, 'index.js')
    execSync(`node ${indexJs}`, {
      stdio: 'inherit',
      env: { ...process.env,
        // 'INPUT_TAG-FORMAT': 'v${version}',
        GITHUB_WORKSPACE: testDir
      }
    })
  })
})
