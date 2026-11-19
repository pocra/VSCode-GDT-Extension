import * as vscode from 'vscode';
import { profileLabel } from './core/analyzer';
import { deactivateAttachments, registerAttachments } from './features/attachments';
import { registerCommands } from './features/commands';
import { registerDiagnostics } from './features/diagnostics';
import { registerHover } from './features/hover';
import { registerNavigation } from './features/navigation';
import { forget, getAnalysis, invalidateConfig, isXdt } from './features/state';

export function activate(context: vscode.ExtensionContext) {
    const diagnostics = registerDiagnostics(context);
    registerHover(context);
    registerNavigation(context);
    registerCommands(context);
    registerAttachments(context);

    // status bar: detected profile + version
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    status.command = 'xdt.showMessage';
    status.tooltip = 'xDT: Nachricht mit Beschreibungen anzeigen';
    context.subscriptions.push(status);
    const updateStatus = () => {
        const doc = vscode.window.activeTextEditor?.document;
        if (!isXdt(doc)) { status.hide(); return; }
        const a = getAnalysis(doc);
        status.text = `$(file-code) ${profileLabel(a.profile)}${a.version ? ' · ' + a.version : ''}`;
        status.show();
    };
    updateStatus();

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateStatus),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === vscode.window.activeTextEditor?.document) { updateStatus(); }
        }),
        vscode.workspace.onDidCloseTextDocument(forget),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('xdt') || e.affectsConfiguration('gdt')) {
                invalidateConfig();
                diagnostics.refreshAll();
                updateStatus();
            }
        }),
    );
}

export function deactivate() {
    deactivateAttachments();
}
