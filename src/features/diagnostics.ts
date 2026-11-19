import * as vscode from 'vscode';
import { Problem } from '../core/types';
import { getAnalysis, isXdt, SELECTOR } from './state';

const SEVERITY: Record<Problem['severity'], vscode.DiagnosticSeverity> = {
    error: vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information,
    hint: vscode.DiagnosticSeverity.Hint,
};

interface XdtDiagnostic extends vscode.Diagnostic { xdtFix?: Problem['fix'] }

export function registerDiagnostics(context: vscode.ExtensionContext) {
    const collection = vscode.languages.createDiagnosticCollection('xdt');
    context.subscriptions.push(collection);

    const timers = new Map<string, NodeJS.Timeout>();
    const refresh = (doc: vscode.TextDocument) => {
        if (!isXdt(doc)) { return; }
        const a = getAnalysis(doc);
        const diags: vscode.Diagnostic[] = a.problems.map(p => {
            const lineLen = doc.lineAt(Math.min(p.line, doc.lineCount - 1)).text.length;
            const range = new vscode.Range(p.line, Math.min(p.startCol, lineLen), p.line, Math.min(Math.max(p.endCol, p.startCol), lineLen));
            const d: XdtDiagnostic = new vscode.Diagnostic(range, p.message, SEVERITY[p.severity]);
            d.source = 'xDT';
            d.code = p.code;
            d.xdtFix = p.fix;
            return d;
        });
        if (doc.eol === vscode.EndOfLine.LF && doc.lineCount > 1) {
            const d = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), 'xDT-Dateien verwenden CR/LF als Zeilenende – die Datei nutzt LF', vscode.DiagnosticSeverity.Warning);
            d.source = 'xDT';
            d.code = 'eol';
            diags.unshift(d);
        }
        collection.set(doc.uri, diags);
    };
    const debounced = (doc: vscode.TextDocument) => {
        const key = doc.uri.toString();
        clearTimeout(timers.get(key));
        timers.set(key, setTimeout(() => refresh(doc), 250));
    };

    vscode.workspace.textDocuments.forEach(refresh);
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument(e => debounced(e.document)),
        vscode.workspace.onDidCloseTextDocument(doc => collection.delete(doc.uri)),
        vscode.languages.registerCodeActionsProvider(SELECTOR, new QuickFixes(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),
    );
    return { refreshAll: () => vscode.workspace.textDocuments.forEach(refresh) };
}

class QuickFixes implements vscode.CodeActionProvider {
    provideCodeActions(doc: vscode.TextDocument, _range: vscode.Range, ctx: vscode.CodeActionContext): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        let hasLength = false;
        for (const d of ctx.diagnostics as XdtDiagnostic[]) {
            if (d.source !== 'xDT') { continue; }
            if (d.code === 'eol') {
                const a = new vscode.CodeAction('Zeilenenden auf CR/LF umstellen', vscode.CodeActionKind.QuickFix);
                a.command = { command: 'xdt.setCrlf', title: 'CR/LF' };
                a.diagnostics = [d];
                actions.push(a);
            }
            if (d.xdtFix) {
                const f = d.xdtFix;
                const a = new vscode.CodeAction(f.title, vscode.CodeActionKind.QuickFix);
                a.edit = new vscode.WorkspaceEdit();
                a.edit.replace(doc.uri, new vscode.Range(d.range.start.line, f.startCol, d.range.start.line, f.endCol), f.text);
                a.diagnostics = [d];
                a.isPreferred = true;
                actions.push(a);
            }
            if (d.code === 'length' || d.code === 'recordLength') { hasLength = true; }
        }
        if (hasLength) {
            const all = new vscode.CodeAction('Alle Feld- und Satzlängen in der Datei korrigieren', vscode.CodeActionKind.QuickFix);
            all.command = { command: 'xdt.fixLengths', title: 'Längen korrigieren' };
            actions.push(all);
        }
        return actions;
    }
}
