import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Attachment, decodeAttachment, decodeIso885915, formatBytes, sniff } from '../core/attachments';
import { getAnalysis, isXdt, SELECTOR } from './state';

const DOC_TYPES: Record<string, string> = { '900': 'LDT-Datensatz' };

let tempDir: string | undefined;

function cfg() {
    const c = vscode.workspace.getConfiguration('xdt.attachments');
    return {
        foldOnOpen: c.get<boolean>('foldOnOpen', true),
        inlineInfo: c.get<boolean>('inlineInfo', true),
        pdfViewer: c.get<'system' | 'vscode'>('pdfViewer', 'system'),
    };
}

export function attachmentAt(doc: vscode.TextDocument, line: number): Attachment | undefined {
    return getAnalysis(doc).attachments.find(a => (line >= a.start && line <= a.end) || line === a.anchor);
}

export function attachmentLabel(doc: vscode.TextDocument, att: Attachment): string {
    const a = getAnalysis(doc);
    let type = att.format ?? '';
    try {
        // sniffing needs only the first base64 lines
        const head = Buffer.from(a.lines.slice(att.start, Math.min(att.end, att.start + 60) + 1).map(l => l.content).join('').replace(/=+$/, ''), 'base64');
        type = sniff(head, att.format).label;
    } catch { /* keep 6303 */ }
    const docType = att.docType ? ` · Dok.-Typ ${att.docType}${DOC_TYPES[att.docType] ? ' (' + DOC_TYPES[att.docType] + ')' : ''}` : '';
    return `${type || 'Anhang'} · ${formatBytes(att.byteSize)} · ${att.lineCount.toLocaleString('de-DE')} Zeilen Base64${docType}`;
}

export function registerAttachments(context: vscode.ExtensionContext) {
    tempDir = path.join(os.tmpdir(), `vscode-xdt-${process.pid}`);
    cleanupTemp();

    const decoration = vscode.window.createTextEditorDecorationType({
        after: { color: new vscode.ThemeColor('editorCodeLens.foreground'), margin: '0 0 0 2em', fontStyle: 'italic' },
    });
    context.subscriptions.push(decoration);

    const decorate = (editor: vscode.TextEditor | undefined) => {
        if (!editor || !isXdt(editor.document)) { return; }
        if (!cfg().inlineInfo) { editor.setDecorations(decoration, []); return; }
        const doc = editor.document;
        const opts = getAnalysis(doc).attachments.map(att => ({
            range: doc.lineAt(att.start).range,
            renderOptions: { after: { contentText: `⟵ ${attachmentLabel(doc, att)}` } },
        }));
        editor.setDecorations(decoration, opts);
    };

    const folded = new Set<string>();
    const foldOnOpen = (editor: vscode.TextEditor | undefined) => {
        if (!editor || !isXdt(editor.document) || !cfg().foldOnOpen) { return; }
        const key = editor.document.uri.toString();
        if (folded.has(key)) { return; }
        folded.add(key);
        const lines = getAnalysis(editor.document).attachments.map(a => a.start);
        if (!lines.length) { return; }
        // folding ranges are computed asynchronously – give the provider a moment
        setTimeout(() => {
            if (vscode.window.activeTextEditor === editor) {
                vscode.commands.executeCommand('editor.fold', { selectionLines: lines, levels: 1 });
            }
        }, 400);
    };

    const onEditor = (e: vscode.TextEditor | undefined) => { decorate(e); foldOnOpen(e); };
    onEditor(vscode.window.activeTextEditor);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(onEditor),
        vscode.workspace.onDidChangeTextDocument(e => {
            const ed = vscode.window.activeTextEditor;
            if (ed && e.document === ed.document) { decorate(ed); }
        }),
        vscode.workspace.onDidCloseTextDocument(d => folded.delete(d.uri.toString())),
        vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration('xdt.attachments')) { decorate(vscode.window.activeTextEditor); } }),

        vscode.languages.registerCodeLensProvider(SELECTOR, {
            provideCodeLenses(doc) {
                const lenses: vscode.CodeLens[] = [];
                for (const att of getAnalysis(doc).attachments) {
                    const range = doc.lineAt(att.anchor).range;
                    const args = [doc.uri, att.start];
                    lenses.push(
                        new vscode.CodeLens(range, { title: `$(eye) ${attachmentLabel(doc, att)} anzeigen`, command: 'xdt.openAttachment', arguments: args }),
                        new vscode.CodeLens(range, { title: '$(save) Speichern unter …', command: 'xdt.saveAttachment', arguments: args }),
                        new vscode.CodeLens(range, { title: '$(fold) Base64 einklappen', command: 'xdt.foldAttachments', arguments: [doc.uri] }),
                    );
                }
                return lenses;
            },
        }),

        vscode.commands.registerCommand('xdt.openAttachment', (uri?: UriArg, line?: number) => withAttachment(toUri(uri), line, openAttachment)),
        vscode.commands.registerCommand('xdt.saveAttachment', (uri?: UriArg, line?: number) => withAttachment(toUri(uri), line, saveAttachment)),
        vscode.commands.registerCommand('xdt.foldAttachments', async (uri?: UriArg) => {
            const editor = await editorFor(uri);
            if (!editor) { return; }
            const lines = getAnalysis(editor.document).attachments.map(a => a.start);
            if (lines.length) { await vscode.commands.executeCommand('editor.fold', { selectionLines: lines, levels: 1 }); }
        }),
        vscode.commands.registerCommand('xdt.unfoldAttachments', async (uri?: UriArg) => {
            const editor = await editorFor(uri);
            if (!editor) { return; }
            const lines = getAnalysis(editor.document).attachments.map(a => a.start);
            if (lines.length) { await vscode.commands.executeCommand('editor.unfold', { selectionLines: lines, levels: 1 }); }
        }),
    );
}

export function deactivateAttachments() {
    cleanupTemp();
}

function cleanupTemp() {
    if (tempDir) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
}

type UriArg = vscode.Uri | string;

function toUri(u?: UriArg): vscode.Uri | undefined {
    return typeof u === 'string' ? vscode.Uri.parse(u) : u;
}

async function editorFor(arg?: UriArg): Promise<vscode.TextEditor | undefined> {
    const uri = toUri(arg);
    const active = vscode.window.activeTextEditor;
    if (!uri || active?.document.uri.toString() === uri.toString()) { return active; }
    return vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
}

async function withAttachment(uri: vscode.Uri | undefined, line: number | undefined,
    fn: (doc: vscode.TextDocument, att: Attachment, bytes: Buffer) => Promise<void>) {
    const doc = uri ? await vscode.workspace.openTextDocument(uri) : vscode.window.activeTextEditor?.document;
    if (!isXdt(doc)) { return; }
    const all = getAnalysis(doc).attachments;
    let att = line !== undefined ? attachmentAt(doc, line) : undefined;
    if (!att && line === undefined) {
        const cursor = vscode.window.activeTextEditor?.selection.active.line ?? 0;
        att = attachmentAt(doc, cursor) ?? (all.length === 1 ? all[0] : undefined);
        if (!att && all.length > 1) {
            const pick = await vscode.window.showQuickPick(all.map(a => ({ label: attachmentLabel(doc, a), description: `Zeile ${a.start + 1}`, a })), { placeHolder: 'Anhang wählen' });
            att = pick?.a;
        }
    }
    if (!att) {
        vscode.window.showInformationMessage('Kein Base64-Anhang (FK 6329) gefunden.');
        return;
    }
    let bytes: Buffer;
    try {
        bytes = decodeAttachment(getAnalysis(doc).lines, att);
    } catch (e) {
        vscode.window.showErrorMessage(`Anhang konnte nicht dekodiert werden: ${e}`);
        return;
    }
    await fn(doc, att, bytes);
}

function baseName(doc: vscode.TextDocument, att: Attachment, ext: string): string {
    const stem = path.basename(doc.fileName).replace(/\.[^.]+$/, '') || 'xdt';
    return `${stem}_Anhang_Z${att.start + 1}.${ext}`;
}

async function openAttachment(doc: vscode.TextDocument, att: Attachment, bytes: Buffer) {
    const s = sniff(bytes, att.format);

    if (s.kind === 'xdt' || s.kind === 'text') {
        // text content opens as an untitled document – nothing is written to disk
        const content = s.kind === 'xdt' ? decodeIso885915(bytes) : bytes.toString(s.ext === 'xml' && /encoding="utf-8"/i.test(bytes.subarray(0, 200).toString('latin1')) ? 'utf8' : 'latin1');
        const td = await vscode.workspace.openTextDocument({ content, language: s.language });
        await vscode.window.showTextDocument(td, { viewColumn: vscode.ViewColumn.Beside, preview: false });
        return;
    }

    fs.mkdirSync(tempDir!, { recursive: true });
    const file = path.join(tempDir!, baseName(doc, att, s.ext));
    fs.writeFileSync(file, bytes);
    const uri = vscode.Uri.file(file);

    if (s.kind === 'image' || (s.kind === 'pdf' && cfg().pdfViewer === 'vscode')) {
        await vscode.commands.executeCommand('vscode.open', uri, vscode.ViewColumn.Beside);
    } else {
        const ok = await vscode.env.openExternal(uri);
        if (!ok) { vscode.window.showWarningMessage(`Konnte ${s.label} nicht mit dem Standardprogramm öffnen: ${file}`); }
    }
}

async function saveAttachment(doc: vscode.TextDocument, att: Attachment, bytes: Buffer) {
    const s = sniff(bytes, att.format);
    const dir = doc.isUntitled ? undefined : vscode.Uri.file(path.dirname(doc.fileName));
    const target = await vscode.window.showSaveDialog({
        defaultUri: dir ? vscode.Uri.joinPath(dir, baseName(doc, att, s.ext)) : undefined,
        filters: { [s.label]: [s.ext], 'Alle Dateien': ['*'] },
        saveLabel: 'Anhang speichern',
    });
    if (!target) { return; }
    await vscode.workspace.fs.writeFile(target, bytes);
    const open = await vscode.window.showInformationMessage(`${s.label} gespeichert (${formatBytes(bytes.length)}).`, 'Öffnen');
    if (open) { await vscode.env.openExternal(target); }
}
