import * as vscode from 'vscode';
import fs from 'node:fs';
import axios from 'axios';
import express, { Request, Response } from "express";

const clientId = "1c846f4c175040149c24404af17bd78a";
const redirectUri = "http://localhost:9878/callback";
let extensionContext: vscode.ExtensionContext;
let provider: CustomSidebarViewProvider;

export function activate(context: vscode.ExtensionContext) {
	extensionContext = context;

	console.log('Congratulations, your extension "SingeLong" is now active!');

	provider = new CustomSidebarViewProvider(context.extensionUri);
	const extensionUri = context.extensionUri;

	(async () => {
		let accessToken = vscode.commands.registerCommand('singelong.accessToken', () => authorize(extensionUri));
		context.subscriptions.push(accessToken);

		let logout = vscode.commands.registerCommand('singelong.logout', () => signOut());
		context.subscriptions.push(logout);

		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				CustomSidebarViewProvider.viewType,
				provider
			)
		);
	})();

	setInterval(async () => {
		const token = extensionContext.globalState.get<string>("access_token");

		if (token == null) {
			provider.view?.webview.postMessage({ 'command': 'getToken' })
		} else {
			const token = await requestAccessToken()

			console.log(token)

			const response = await axios.get('https://api.spotify.com/v1/me/player', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			})

			const data = response.data;

			const responseLyrics = await axios.get(`https://lyrics-api.qolbudr.workers.dev/?artist=${data.item.artists[0].name}&name=${data.item.name}`)

			const dataLyrics = responseLyrics.data;

			provider.view?.webview.postMessage({
				'command': 'updatePlayer',
				'content': {
					'lyrics': dataLyrics,
					'milliseconds': data.progress_ms
				}
			})
		}
	}, 500)
}

const authorize = async (_extensionUri: vscode.Uri) => {
	const app = express();

	app.get("/callback", async (req: Request, res: Response) => {
		const contentUri = vscode.Uri.joinPath(_extensionUri, "assets", "close.html")
		const content = fs.readFileSync(contentUri.fsPath, 'utf-8');
		const code = req.query.code

		extensionContext.globalState.update("code", code);
		await requestAccessToken();

		vscode.window.showInformationMessage('SingeLong: Access token has been granted');
		res.send(content);
	});

	app.listen(9878);
	vscode.env.openExternal(vscode.Uri.parse(`https://accounts.spotify.com/en/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=user-read-playback-state`));
}

const signOut = async () => {
	extensionContext.globalState.update("access_token", null);
	extensionContext.globalState.update("expired_in", null);
	extensionContext.globalState.update("code", null);
	extensionContext.globalState.update("refresh_token", null);
}

const requestAccessToken = async (): Promise<string> => {
	const code = extensionContext.globalState.get<string>("code");
	const timestamp = Date.now();
	const expiredIn = extensionContext.globalState.get<number>("expired_in") || 0;
	const accessToken = extensionContext.globalState.get<string>("access_token");
	const refreshToken = extensionContext.globalState.get<string>("refresh_token");


	if ((timestamp >= expiredIn) && refreshToken != null) {
		const response = await axios.post(
			'https://accounts.spotify.com/api/token', `client_id=${clientId}&grant_type=refresh_token&refresh_token=${refreshToken}`,
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": "Basic MWM4NDZmNGMxNzUwNDAxNDljMjQ0MDRhZjE3YmQ3OGE6Y2UxYTNjMjVhOGRkNDNhM2E3MzQ2NGIwN2VjZjA4ZTI=",
				},
			}
		)

		const data = response.data;

		extensionContext.globalState.update("access_token", data.access_token);
		extensionContext.globalState.update("expired_in", Date.now() + (data.expired_in * 1000));
		extensionContext.globalState.update("refresh_token", data.refresh_token);

		return data.access_token;
	} else {
		if (accessToken == null) {
			const response = await axios.post(
				'https://accounts.spotify.com/api/token', `client_id=${clientId}&grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`,
				{
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"Authorization": "Basic MWM4NDZmNGMxNzUwNDAxNDljMjQ0MDRhZjE3YmQ3OGE6Y2UxYTNjMjVhOGRkNDNhM2E3MzQ2NGIwN2VjZjA4ZTI=",
					},
				}
			)

			const data = response.data;

			extensionContext.globalState.update("access_token", data.access_token);
			extensionContext.globalState.update("expired_in", Date.now() + (data.expired_in * 1000));
			extensionContext.globalState.update("refresh_token", data.refresh_token);

			return data.access_token;
		}

		return accessToken;
	}
}

class CustomSidebarViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "singelong.openview";
	public view?: vscode.WebviewView;
	constructor(private readonly _extensionUri: vscode.Uri) { }

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		this.view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		const contentUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "assets", "index.html")
		);

		webviewView.webview.html = this.getHtmlContent(contentUri);
	}

	private getHtmlContent(contentUri: vscode.Uri): string {
		const content = fs.readFileSync(contentUri.fsPath, 'utf-8');
		return content;
	}
}

export function deactivate() { }
