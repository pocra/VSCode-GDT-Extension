import * as vscode from 'vscode';
import { Analysis, isObjectProfile, XdtObject } from '../core/analyzer';
import { formatBytes } from '../core/attachments';
import { config, dictionary, getAnalysis, SELECTOR } from './state';

export function registerNavigation(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(SELECTOR, { provideDocumentSymbols }, { label: 'xDT' }),
        vscode.languages.registerFoldingRangeProvider(SELECTOR, { provideFoldingRanges }),
        vscode.languages.registerCompletionItemProvider(SELECTOR, { provideCompletionItems }),
    );
}

/* ------------------------------ Outline ------------------------------ */

function lineRange(doc: vscode.TextDocument, from: number, to: number): vscode.Range {
    return new vscode.Range(from, 0, to, doc.lineAt(Math.min(to, doc.lineCount - 1)).text.length);
}

/** Short summary for a record, e.g. patient name */
function recordDetail(a: Analysis, start: number, end: number): string {
    let name = '', first = '', bdate = '';
    for (let k = start; k <= end; k++) {
        const l = a.lines[k];
        if (!l.ok) { continue; }
        if (l.fk === '3101' && !name) { name = l.content; }
        if (l.fk === '3102' && !first) { first = l.content; }
        if (l.fk === '3103' && !bdate) { bdate = l.content; }
    }
    return [name && first ? `${name}, ${first}` : name, bdate].filter(Boolean).join(' · ');
}

function provideDocumentSymbols(doc: vscode.TextDocument): vscode.DocumentSymbol[] {
    const a = getAnalysis(doc);
    const dict = dictionary(a.profile);
    const showFields = config().outlineFields;

    const objectSymbol = (o: XdtObject): vscode.DocumentSymbol => {
        const from = o.attrLine ?? o.start;
        const attr = o.attrLine !== undefined ? a.lines[o.attrLine].content : undefined;
        const name = attr ?? (dict.objectName(o.id) ?? o.id);
        const att = a.attachments.find(x => x.start > o.start && x.end < o.end);
        const detail = att && (o.id === 'Obj_0010' || o.id === 'Obj_0068')
            ? `${att.format ?? 'Base64'} · ${formatBytes(att.byteSize)}`
            : `${o.id} ${dict.objectName(o.id) ?? ''}`.trim();
        const s = new vscode.DocumentSymbol(name, detail, o.id === 'Obj_0010' ? vscode.SymbolKind.File : vscode.SymbolKind.Object,
            lineRange(doc, from, o.end), lineRange(doc, o.start, o.start));
        s.children = o.children.map(objectSymbol);
        if (showFields) { s.children.push(...fieldSymbols(o.start + 1, o.end - 1, o.children)); }
        s.children.sort((x, y) => x.range.start.line - y.range.start.line);
        return s;
    };

    const fieldSymbols = (from: number, to: number, nested: XdtObject[]): vscode.DocumentSymbol[] => {
        const skip = new Set<number>();
        for (const o of nested) { for (let k = o.attrLine ?? o.start; k <= o.end; k++) { skip.add(k); } }
        const out: vscode.DocumentSymbol[] = [];
        for (let k = from; k <= to; k++) {
            const l = a.lines[k];
            if (!l?.ok || skip.has(k) || l.fk === '8000' || l.fk === '8001') { continue; }
            if (l.fk === '6329' && a.lines[k - 1]?.fk === '6329') { continue; }
            const name = dict.field(l.fk)?.def.name ?? l.fk;
            out.push(new vscode.DocumentSymbol(`${l.fk} ${name}`, l.content, vscode.SymbolKind.Field, lineRange(doc, k, k), lineRange(doc, k, k)));
        }
        return out;
    };

    return a.records.map(r => {
        const label = `${r.type} ${dict.recordType(r.type) ?? ''}`.trim();
        const s = new vscode.DocumentSymbol(label, recordDetail(a, r.start, r.end), vscode.SymbolKind.Struct,
            lineRange(doc, r.start, r.end), lineRange(doc, r.start, r.start));
        s.children = r.objects.map(objectSymbol);
        if (showFields) { s.children.push(...fieldSymbols(r.start + 1, r.end, r.objects)); }
        s.children.sort((x, y) => x.range.start.line - y.range.start.line);
        return s;
    });
}

/* ------------------------------ Folding ------------------------------ */

function provideFoldingRanges(doc: vscode.TextDocument): vscode.FoldingRange[] {
    const a = getAnalysis(doc);
    const out: vscode.FoldingRange[] = [];
    const walk = (o: XdtObject) => {
        const from = o.attrLine ?? o.start;
        if (o.end > from) { out.push(new vscode.FoldingRange(from, o.end, vscode.FoldingRangeKind.Region)); }
        o.children.forEach(walk);
    };
    for (const r of a.records) {
        if (r.end > r.start) { out.push(new vscode.FoldingRange(r.start, r.end, vscode.FoldingRangeKind.Region)); }
        r.objects.forEach(walk);
    }
    // base64 runs: fold everything after the first line
    for (const att of a.attachments) {
        if (att.end > att.start) { out.push(new vscode.FoldingRange(att.start, att.end, vscode.FoldingRangeKind.Region)); }
    }
    return out;
}

/* ------------------------------ Completion ------------------------------ */

function provideCompletionItems(doc: vscode.TextDocument, pos: vscode.Position): vscode.CompletionItem[] | undefined {
    const prefix = doc.lineAt(pos.line).text.slice(0, pos.character);
    if (!/^\d{0,7}$/.test(prefix)) { return undefined; }
    const a = getAnalysis(doc);
    const dict = dictionary(a.profile);
    const range = new vscode.Range(pos.line, 0, pos.line, pos.character);
    const lenPart = prefix.length > 4 ? prefix.slice(0, 3) : '';
    const items: vscode.CompletionItem[] = [];

    // object snippet after an object attribute
    const prev = pos.line > 0 ? a.lines[pos.line - 1] : undefined;
    const attrDef = prev?.ok ? dict.field(prev.fk)?.def : undefined;
    if (attrDef?.obj && isObjectProfile(a.profile)) {
        const id = attrDef.obj;
        const item = new vscode.CompletionItem(`${id} ${dict.objectName(id) ?? ''} – Objekt einfügen`, vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString(`0178002${id}\n$0\n0178003${id}`);
        item.range = range;
        item.filterText = prefix + id;
        item.sortText = '0';
        item.preselect = true;
        items.push(item);
    }

    for (const def of dict.allFields()) {
        const item = new vscode.CompletionItem({ label: def.fk, description: def.name }, def.obj ? vscode.CompletionItemKind.Class : vscode.CompletionItemKind.Field);
        item.range = range;
        item.filterText = lenPart + def.fk;
        item.sortText = '1' + def.fk;
        if (def.attr && isObjectProfile(a.profile)) {
            const len = String(def.attr.length + 9).padStart(3, '0');
            item.insertText = new vscode.SnippetString(`${len}${def.fk}${def.attr}\n0178002${def.obj}\n$0\n0178003${def.obj}`);
            item.detail = `Objektattribut → ${def.obj}`;
        } else {
            item.insertText = `000${def.fk}`;
            item.detail = 'Länge wird über „xDT: Längen korrigieren“ bzw. beim Speichern gesetzt';
        }
        items.push(item);
    }
    return items;
}
