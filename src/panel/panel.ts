import * as vscode from 'vscode';
import fs from 'node:fs';

export class SingeLongViewProvider implements vscode.WebviewViewProvider {
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