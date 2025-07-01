const core = require('@actions/core');
const fs = require('fs');
// const github = require('@actions/github');

const release = async () => {
    const semanticRelease = await import('semantic-release');
    const options = {
        dryRun: true,
        plugins: [
            '@semantic-release/commit-analyzer',
            '@semantic-release/release-notes-generator',
            // [
            //     '@semantic-release/changelog',
            //     {
            //         changelogFile: 'docs/CHANGELOG.md'
            //     }
            // ]
        ]
    }
    let result;
    try {
        result = await semanticRelease.default(options);
    } catch (e) {
        if (e.command.startsWith('git fetch --tags')) {
            throw new Error('git fetch --tags failed. Run `git fetch --tags --force` manually to update the tags.', { cause: e })
        }
        throw e
    }

    if (result) {
        const nextRelease = result.nextRelease
        const version = nextRelease.version
        fs.writeFileSync('next_version', version, 'utf8');
    }

    console.log(result)
};

// const cancelWorkflow = async () => {
//     try {
//         const token = core.getInput('github-token', { required: true });
//         const runId = core.getInput('run-id', { required: true });
//
//         const octokit = github.getOctokit(token);
//
//         await octokit.rest.actions.cancelWorkflowRun({
//             owner: github.context.repo.owner,
//             repo: github.context.repo.repo,
//             run_id: runId
//         });
//
//         core.info(`Workflow run ${runId} has been successfully canceled.`);
//     } catch (error) {
//         core.setFailed(`Failed to cancel workflow: ${error.message}`);
//     }
// };

module.exports = () => {
    core.debug('Initialization successful');
    release().catch(core.setFailed);
};
