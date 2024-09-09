import * as vscode from 'vscode';

export class OllmaExplanationProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ollmaExplanation';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    public updateContent(content: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'update', content });
            console.log('Content sent to webview:', content);
        } else {
            console.log('View is not available');
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Ollma Explanation</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-editor-foreground); }
                    #content { white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <h1>Ollma Explanation</h1>
                <div id="content">Waiting for content...</div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const contentElement = document.getElementById('content');
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                contentElement.textContent = message.content;
                                console.log('Content updated:', message.content);
                                break;
                        }
                    });
                    console.log('Webview script loaded');
                </script>
            </body>
            </html>
        `;
    }
}