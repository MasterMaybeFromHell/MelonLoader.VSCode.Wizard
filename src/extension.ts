import * as vscode from 'vscode';
import { createProject } from './projectCreator';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('melonloader.wizard.createProject', async () => {
        try {
            await createProject(context);
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error during project creation: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred.');
            }
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}