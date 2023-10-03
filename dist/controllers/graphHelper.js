"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeGraphCallAsync = exports.getUsersAsync = exports.sendMailAsync = exports.getInboxAsync = exports.getUserAsync = exports.getUserTokenAsync = exports.initializeGraphForUserAuth = void 0;
// <UserAuthConfigSnippet>
require("isomorphic-fetch");
const identity_1 = require("@azure/identity");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const azureTokenCredentials_1 = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
let _settings = undefined;
let _deviceCodeCredential = undefined;
let _userClient = undefined;
function initializeGraphForUserAuth(settings, deviceCodePrompt) {
    // Ensure settings isn't null
    if (!settings) {
        throw new Error('Settings cannot be undefined');
    }
    _settings = settings;
    _deviceCodeCredential = new identity_1.DeviceCodeCredential({
        clientId: settings.clientId,
        tenantId: settings.authTenant,
        userPromptCallback: deviceCodePrompt
    });
    const authProvider = new azureTokenCredentials_1.TokenCredentialAuthenticationProvider(_deviceCodeCredential, {
        scopes: settings.graphUserScopes
    });
    _userClient = microsoft_graph_client_1.Client.initWithMiddleware({
        authProvider: authProvider
    });
}
exports.initializeGraphForUserAuth = initializeGraphForUserAuth;
// </UserAuthConfigSnippet>
// <GetUserTokenSnippet>
async function getUserTokenAsync() {
    // Ensure credential isn't undefined
    if (!_deviceCodeCredential) {
        throw new Error('Graph has not been initialized for user auth');
    }
    // Ensure scopes isn't undefined
    if (!(_settings === null || _settings === void 0 ? void 0 : _settings.graphUserScopes)) {
        throw new Error('Setting "scopes" cannot be undefined');
    }
    // Request token with given scopes
    const response = await _deviceCodeCredential.getToken(_settings === null || _settings === void 0 ? void 0 : _settings.graphUserScopes);
    return response.token;
}
exports.getUserTokenAsync = getUserTokenAsync;
// </GetUserTokenSnippet>
// <GetUserSnippet>
async function getUserAsync() {
    // Ensure client isn't undefined
    if (!_userClient) {
        throw new Error('Graph has not been initialized for user auth');
    }
    return _userClient.api('/me')
        // Only request specific properties
        .select(['displayName', 'mail', 'userPrincipalName'])
        .get();
}
exports.getUserAsync = getUserAsync;
// </GetUserSnippet>
// <GetInboxSnippet>
async function getInboxAsync() {
    // Ensure client isn't undefined
    if (!_userClient) {
        throw new Error('Graph has not been initialized for user auth');
    }
    return _userClient.api('/me/mailFolders/inbox/messages')
        .select(['from', 'isRead', 'receivedDateTime', 'subject'])
        .top(25)
        .orderby('receivedDateTime DESC')
        .get();
}
exports.getInboxAsync = getInboxAsync;
// </GetInboxSnippet>
// <SendMailSnippet>
async function sendMailAsync(subject, body, recipient) {
    // Ensure client isn't undefined
    if (!_userClient) {
        throw new Error('Graph has not been initialized for user auth');
    }
    // Create a new message
    const message = {
        subject: subject,
        body: {
            content: body,
            contentType: 'text'
        },
        toRecipients: [
            {
                emailAddress: {
                    address: recipient
                }
            }
        ]
    };
    // Send the message
    return _userClient.api('me/sendMail')
        .post({
        message: message
    });
}
exports.sendMailAsync = sendMailAsync;
// </SendMailSnippet>
// <AppOnyAuthConfigSnippet>
let _clientSecretCredential = undefined;
let _appClient = undefined;
function ensureGraphForAppOnlyAuth() {
    // Ensure settings isn't null
    if (!_settings) {
        throw new Error('Settings cannot be undefined');
    }
    if (!_clientSecretCredential) {
        _clientSecretCredential = new identity_1.ClientSecretCredential(_settings.tenantId, _settings.clientId, _settings.clientSecret);
    }
    if (!_appClient) {
        const authProvider = new azureTokenCredentials_1.TokenCredentialAuthenticationProvider(_clientSecretCredential, {
            scopes: ['https://graph.microsoft.com/.default']
        });
        _appClient = microsoft_graph_client_1.Client.initWithMiddleware({
            authProvider: authProvider
        });
    }
}
// </AppOnyAuthConfigSnippet>
// <GetUsersSnippet>
async function getUsersAsync() {
    ensureGraphForAppOnlyAuth();
    return _appClient === null || _appClient === void 0 ? void 0 : _appClient.api('/users').select(['displayName', 'id', 'mail']).top(25).orderby('displayName').get();
}
exports.getUsersAsync = getUsersAsync;
// </GetUsersSnippet>
// <MakeGraphCallSnippet>
// This function serves as a playground for testing Graph snippets
// or other code
async function makeGraphCallAsync() {
    // INSERT YOUR CODE HERE
    // Note: if using _appClient, be sure to call ensureGraphForAppOnlyAuth
    // before using it.
    // ensureGraphForAppOnlyAuth();
}
exports.makeGraphCallAsync = makeGraphCallAsync;
// </MakeGraphCallSnippet>
