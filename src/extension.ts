import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './markdownEditor';

export function activate(context: vscode.ExtensionContext) {
	console.log('Typora VSC extension is now active!');
	context.subscriptions.push(MarkdownEditorProvider.register(context));
}

export function deactivate() {}
