import * as vscode from 'vscode';
import fs from 'node:fs';

const clientId = "1c846f4c175040149c24404af17bd78a";
const redirectUri = "http://localhost:3000/callback";
let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "SingeLong" is now active!');
	const provider = new CustomSidebarViewProvider(context.extensionUri);

	(async () => {
		let accessToken = vscode.commands.registerCommand('singelong.accessToken', getAccessToken);
		context.subscriptions.push(accessToken);

		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				CustomSidebarViewProvider.viewType,
				provider
			)
		);

	})();
}

const getAccessToken = async () => {
	
}

class CustomSidebarViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "singelong.openview";
	private _view?: vscode.WebviewView;
	constructor(private readonly _extensionUri: vscode.Uri) { }

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		const stylesheetUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
		);

		const contentUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "assets", "index.html")
		);

		webviewView.webview.html = this.getHtmlContent(stylesheetUri, contentUri);
	}

	private getHtmlContent(stylesheetUri: vscode.Uri, contentUri: vscode.Uri): string {
		const content = fs.readFileSync(contentUri.fsPath, 'utf-8');
		return content;
	}
}

export function deactivate() { }
