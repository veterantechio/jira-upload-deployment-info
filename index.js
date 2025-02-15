"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise-native');
const dateFormat = require('dateformat');
const token = require('@highwaythree/jira-github-actions-common');
async function submitDeploymentInfo(accessToken) {
    const cloudInstanceBaseUrl = core.getInput('cloud-instance-base-url');
    const cloudURL = new url_1.URL('/_edge/tenant_info', cloudInstanceBaseUrl);
    let cloudId = await request(cloudURL.href);
    cloudId = JSON.parse(cloudId);
    cloudId = cloudId.cloudId;
    const deploymentSequenceNumber = core.getInput('deployment-sequence-number');
    const updateSequenceNumber = core.getInput('update-sequence-number');
    const issueKeys = core.getInput('issue-keys');
    const displayName = core.getInput('display-name');
    const url = core.getInput('url');
    const description = core.getInput('description');
    let lastUpdated = core.getInput('last-updated');
    const label = core.getInput('label');
    const state = core.getInput('state');
    const pipelineId = core.getInput('pipeline-id');
    const pipelineDisplayName = core.getInput('pipeline-display-name');
    const pipelineUrl = core.getInput('pipeline-url');
    const environmentId = core.getInput('environment-id');
    const environmentDisplayName = core.getInput('environment-display-name');
    const environmentType = core.getInput('environment-type');
    const serviceIds = core.getInput('service-ids');
    const jiraAccountId = core.getInput('jira-account-id');
    const jiraProjectId = core.getInput('jira-project-id');
    // console.log("lastUpdated: " + lastUpdated);
    lastUpdated = dateFormat(lastUpdated, "yyyy-mm-dd'T'HH:MM:ss'Z'");
    const deployment = {
        schemaVersion: "1.0",
        deploymentSequenceNumber: deploymentSequenceNumber || process.env['GITHUB_RUN_ID'],
        updateSequenceNumber: updateSequenceNumber || process.env['GITHUB_RUN_ID'],
        associations: [
            {
                associationType: 'issueKeys',
                values: issueKeys.split(',') || []
            },
            {
                associationType: 'serviceIdOrKeys',
                values: serviceIds.split(',') || []
            }
        ],
        displayName: displayName || '',
        url: url || `${github.context.payload.repository.url}/actions/runs/${process.env['GITHUB_RUN_ID']}`,
        description: description || '',
        lastUpdated: lastUpdated || '',
        label: label || '',
        state: state || '',
        pipeline: {
            id: pipelineId || `${github.context.payload.repository.full_name} ${github.context.workflow}`,
            displayName: pipelineDisplayName || `Workflow: ${github.context.workflow} (#${process.env['GITHUB_RUN_NUMBER']})`,
            url: pipelineUrl || `${github.context.payload.repository.url}/actions/runs/${process.env['GITHUB_RUN_ID']}`,
        },
        environment: {
            id: environmentId || '',
            displayName: environmentDisplayName || '',
            type: environmentType || '',
        },
//         commands: [
//             {
//                 command: "initiate_deployment_gating"
//             }
//         ]
    };
    let bodyData = {
        deployments: [deployment],
        properties: {
            accountId: jiraAccountId || '',
            projectId: jiraProjectId || ''
        },
    };
    bodyData = JSON.stringify(bodyData);
    const options = {
        method: 'POST',
        url: "https://api.atlassian.com/jira/deployments/0.1/cloud/" + cloudId + "/bulk",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            Authorization: "Bearer " + accessToken,
        },
        body: bodyData,
    };
    let responseJson = await request(options);
    let response = JSON.parse(responseJson);
    if (response.rejectedDeployments && response.rejectedDeployments.length > 0) {
        const rejectedDeployment = response.rejectedDeployments[0];
        // console.log("errors: ", rejectedDeployment.errors);
        let errors = rejectedDeployment.errors.map((error) => error.message).join(',');
        errors.substr(0, errors.length - 1);
        // console.log("joined errors: ", errors);
        core.setFailed(errors);
    }
    core.setOutput("response", responseJson);
}
exports.submitDeploymentInfo = submitDeploymentInfo;
(async function () {
    try {
        const clientId = core.getInput('client-id');
        const clientSecret = core.getInput('client-secret');
        const accessTokenResponse = await token.getAccessToken(clientId, clientSecret);
        await submitDeploymentInfo(accessTokenResponse.access_token);
        // console.log("finished submitting deployment info");
    }
    catch (error) {
        core.setFailed(error.message);
    }
})();
