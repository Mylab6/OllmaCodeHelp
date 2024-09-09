import * as vscode from 'vscode';
import axios from 'axios';
import { OllmaExplanationProvider } from './OllmaExplanationProvider';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating OllmaCodeHelp extension');
    outputChannel = vscode.window.createOutputChannel("OllmaCodeHelp");
    
    const provider = new OllmaExplanationProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(OllmaExplanationProvider.viewType, provider)
    );

    let disposable = vscode.commands.registerTextEditorCommand('ollmaCodeHelp.explainCode', async (textEditor: vscode.TextEditor) => {
        console.log('explainCode command triggered');
        const selection = textEditor.selection;
        const text = textEditor.document.getText(selection);
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating explanation...",
            cancellable: false
        }, async () => {
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

    console.log('OllmaCodeHelp extension is now active');
}

async function fetchExplanation(context: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('ollmaCodeHelp');
    const apiUrl = config.get<string>('apiEndpoint') || "http://localhost:11434/api/generate";
    const model = config.get<string>('model') || "deepseek-coder-v2";

    const prompt = `Explain the following code and suggest possible improvements:\n\n${context}\n\nExplanation:`;

    try {
        const response = await axios.post(apiUrl, {
            model: model,
            prompt: prompt,
            stream: false
        });

        console.log(`API Response:`, response.data);

        if (response.data && response.data.response) {
            return response.data.response;
        } else {
            console.log("Unexpected response format");
            throw new Error("Unexpected response format from API");
        }
    } catch (error: any) {
        console.error(`API request error:`, error);
        throw error;
    }
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
    console.log('OllmaCodeHelp extension is now deactivated');
}