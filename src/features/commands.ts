import * as vscode from 'vscode';
import { computeLengthFixes, expectedLength, profileLabel } from '../core/analyzer';
import { kvnrCheckDigit, pad3 } from '../core/checks';
import { formatBytes } from '../core/attachments';
import { config, dictionary, getAnalysis, isXdt } from './state';

let output: vscode.OutputChannel | undefined;

export function registerCommands(context: vscode.ExtensionContext) {
    const active = () => {
        const doc = vscode.window.activeTextEditor?.document;
        if (!isXdt(doc)) {
            vscode.window.showWarningMessage('Kein GDT-/LDT-/KVDT-Dokument aktiv.');
            return undefined;
        }
        return doc;
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('xdt.fixLengths', async () => {
            const doc = active();
            if (!doc) { return; }
            const edits = lengthEdits(doc);
            if (!edits.length) {
                vscode.window.showInformationMessage('Alle Feldlängen sind korrekt.');
                return;
            }
            const we = new vscode.WorkspaceEdit();
            we.set(doc.uri, edits);
            await vscode.workspace.applyEdit(we);
            vscode.window.showInformationMessage(`${edits.length} Zeile(n) korrigiert.`);
        }),

        vscode.commands.registerCommand('xdt.showMessage', () => {
            const doc = active();
            if (doc) { showMessage(doc); }
        }),

        vscode.commands.registerCommand('xdt.anonymize', async () => {
            const doc = active();
            if (!doc) { return; }
            const pick = await vscode.window.showWarningMessage(
                'Patientendaten (Name, Geburtsdatum, Adresse, Versichertennummer …) im aktiven Dokument durch Platzhalter ersetzen? Die Änderung ist rückgängig machbar (Strg+Z), solange nicht gespeichert wurde.',
                { modal: true }, 'Anonymisieren');
            if (pick !== 'Anonymisieren') { return; }
            const n = await anonymize(doc);
            vscode.window.showInformationMessage(`${n} Feld(er) anonymisiert. Liste der Felder: Einstellung „xdt.anonymize.fields“.`);
        }),

        vscode.commands.registerCommand('xdt.setCrlf', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && isXdt(editor.document)) {
                await editor.edit(b => b.setEndOfLine(vscode.EndOfLine.CRLF));
            }
        }),

        // keep the command ids of the original extension working
        vscode.commands.registerCommand('gdt.FixLengthVariables', () => vscode.commands.executeCommand('xdt.fixLengths')),
        vscode.commands.registerCommand('gdt.DisplayMessage', () => vscode.commands.executeCommand('xdt.showMessage')),

        vscode.workspace.onWillSaveTextDocument(e => {
            if (isXdt(e.document) && config().fixLengthsOnSave) {
                e.waitUntil(Promise.resolve(lengthEdits(e.document)));
            }
        }),
    );
}

export function lengthEdits(doc: vscode.TextDocument): vscode.TextEdit[] {
    return computeLengthFixes(getAnalysis(doc)).map(f => vscode.TextEdit.replace(doc.lineAt(f.line).range, f.text));
}

function showMessage(doc: vscode.TextDocument) {
    const a = getAnalysis(doc);
    const dict = dictionary(a.profile);
    const en = config().language === 'English';
    if (!output) { output = vscode.window.createOutputChannel('xDT'); }
    output.clear();

    const rows: [string, string, string][] = [];
    for (const l of a.lines) {
        if (!l.ok) { if (l.text) { rows.push(['????', '(ungültige Zeile)', l.text]); } continue; }
        if (l.fk === '6329') {
            const att = a.attachments.find(x => x.start === l.line);
            if (!att) { continue; }
            const obj6329 = a.objectAt[l.line];
            rows.push(['6329', '  '.repeat(obj6329 ? obj6329.depth + 1 : 0) + (dict.field('6329')?.def.name ?? ''),
                `[Base64 ${att.format ?? ''} · ${formatBytes(att.byteSize)} · ${att.lineCount} Zeilen ausgelassen]`]);
            continue;
        }
        const obj = a.objectAt[l.line];
        let depth = obj ? obj.depth + 1 : 0;
        if (l.fk === '8002' || l.fk === '8003') { depth = obj ? obj.depth : 0; }
        if (l.fk === '8000' || l.fk === '8001') { depth = 0; }
        const indent = '  '.repeat(depth);
        let content = l.content;
        const def = dict.field(l.fk)?.def;
        if (l.fk === '8000' || l.fk === '8001') {
            const t = dict.recordType(l.content);
            if (t) { content += ` (${t})`; }
        } else if (l.fk === '8002') {
            const n = dict.objectName(l.content);
            if (n) { content += ` (${n})`; }
        } else if (def?.values?.[l.content]) {
            content += ` (${def.values[l.content]})`;
        }
        rows.push([l.fk, indent + (def?.name ?? ''), content]);
    }
    const w = Math.min(70, Math.max(...rows.map(r => r[1].length), 12)) + 3;
    output.appendLine(`${doc.fileName}  –  ${profileLabel(a.profile)}${a.version ? ' ' + a.version : ''}`);
    output.appendLine('');
    output.appendLine(en ? 'Field   Description'.padEnd(w + 8) + 'Content' : 'Feld    Beschreibung'.padEnd(w + 8) + 'Inhalt');
    for (const [fk, desc, content] of rows) {
        const d = desc.length > w - 1 ? desc.slice(0, w - 2) + '…' : desc;
        output.appendLine(`${fk}    ${d.padEnd(w)}${content}`);
    }
    const errors = a.problems.filter(p => p.severity === 'error').length;
    const warnings = a.problems.filter(p => p.severity === 'warning').length;
    output.appendLine('');
    output.appendLine(`${a.records.length} Sätze · ${errors} Fehler · ${warnings} Warnungen`);
    output.show(true);
}

/** placeholder per FK – keeps format and length constraints valid */
function placeholder(fk: string, value: string, counter: number): string {
    switch (fk) {
        case '3105': return '1'.repeat(Math.max(6, Math.min(value.length, 12)));
        case '3119': return 'X00000000' + kvnrCheckDigit('X00000000');
        case '3110': case '3108': case '3116': return value;
        case '3112': return '00000';
        case '3109': return '1';
        case '3000': return `ANON${counter}`;
        case '3101': return 'Mustermann';
        case '3102': return 'Max';
        default:
            if (/^\d+$/.test(value)) { return '0'.repeat(value.length); }
            return 'XXX';
    }
}

async function anonymize(doc: vscode.TextDocument): Promise<number> {
    const a = getAnalysis(doc);
    const fields = new Set(config().anonymizeFields);
    const edits: vscode.TextEdit[] = [];
    let n = 0;
    for (const l of a.lines) {
        if (!l.ok || !fields.has(l.fk)) { continue; }
        let value = placeholder(l.fk, l.content, ++n);
        // GDT 2.x uses TTMMJJJJ for 3103, everything newer JJJJMMTT
        if ((l.fk === '3103' || l.fk === '7351') && /^\d{8}$/.test(l.content)) {
            value = a.profile === 'gdt2' ? '01011970' : '19700101';
        }
        edits.push(vscode.TextEdit.replace(doc.lineAt(l.line).range, pad3(expectedLength(value)) + l.fk + value));
    }
    if (edits.length) {
        const we = new vscode.WorkspaceEdit();
        we.set(doc.uri, edits);
        await vscode.workspace.applyEdit(we);
        // 8100 record lengths (GDT/LDT 2.x) may have changed
        const fix = lengthEdits(doc);
        if (fix.length) {
            const we2 = new vscode.WorkspaceEdit();
            we2.set(doc.uri, fix);
            await vscode.workspace.applyEdit(we2);
        }
    }
    return edits.length;
}
