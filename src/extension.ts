import * as vscode from 'vscode';
import axios from 'axios';

let outputChannel: vscode.OutputChannel;

class OllmaExplanationProvider implements vscode.WebviewViewProvider {
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
            </head>
            <body>
                <div id="content"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                document.getElementById('content').innerHTML = message.content;
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel("OllmaCodeHelp");
    
    const provider = new OllmaExplanationProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(OllmaExplanationProvider.viewType, provider)
    );

    let disposable = vscode.commands.registerTextEditorCommand('ollmaCodeHelp.explainCode', async (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
        const document = textEditor.document;
        const selection = textEditor.selection;
        const text = document.getText(selection);
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating explanation...",
            cancellable: false
        }, async (progress) => {
            try {
                const explanation = await fetchExplanation(text);
                provider.updateContent(explanation);
                vscode.commands.executeCommand('workbench.view.extension.ollmaExplanationView');
            } catch (error: any) {
                vscode.window.showErrorMessage(`Error generating explanation: ${error.message}`);
            }
        });
    });

    context.subscriptions.push(disposable);

    log('OllmaCodeHelp extension is now active');
}

async function fetchExplanation(context: string): Promise<string> {
    const apiUrl = "http://localhost:11434/api/generate"; // Your local API URL
    const prompt = createPrompt(context);

    try {
        const response = await axios.post(apiUrl, {
            model: "deepseek-coder-v2",
            prompt: prompt,
            stream: false
        });

        log(`API Response: ${JSON.stringify(response.data)}`);

        if (response.data && response.data.response) {
            return response.data.response;
        } else {
            log("Unexpected response format");
            throw new Error("Unexpected response format from API");
        }
    } catch (error: any) {
        log(`API request error: ${error.message}`);
        throw error;
    }
}

function createPrompt(context: string): string {
    return `Explain the following code and suggest possible improvements:

${context}

Explanation:`;
}

function log(message: string) {
    console.log(message);
    outputChannel.appendLine(message);
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
    log('OllmaCodeHelp extension is now deactivated');
}