'use strict';

import * as vscode from 'vscode';
import { TestExplorerExtension, testExplorerExtensionId } from 'vscode-test-adapter-api';
import { TestAdapterRegistrar, Log } from 'vscode-test-adapter-util';
import { GoTestAdapter } from './adapter';

export async function activate(context: vscode.ExtensionContext) {
	const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];
	const log = new Log('goExplorer', workspaceFolder, 'Go Explorer Log');

    const testExplorerExtension = vscode.extensions.getExtension<TestExplorerExtension>(testExplorerExtensionId);
	console.log(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);
	const channel = vscode.window.createOutputChannel('Go Tests');

	if (testExplorerExtension) {
		
		if (!testExplorerExtension.isActive) {
			log.warn('Test Explorer is not active - trying to activate');
			await testExplorerExtension.activate();
		}

		context.subscriptions.push(new TestAdapterRegistrar(
			testExplorerExtension.exports,
			(workspaceFolder) => new GoTestAdapter(workspaceFolder, channel, log),
			log
		));
    }
    
    console.log('GoExplorer extension activated');
}