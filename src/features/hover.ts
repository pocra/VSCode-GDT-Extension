import * as vscode from 'vscode';
import { expectedLength, XdtObject, profileLabel } from '../core/analyzer';
import { parseLen, describeLen, pad3 } from '../core/checks';
import { attachmentAt, attachmentLabel } from './attachments';
import { dictionary, getAnalysis, SELECTOR } from './state';

const TYPE_LABEL: Record<string, string> = {
    num: 'numerisch', n: 'numerisch', alnum: 'alphanumerisch', a: 'alphanumerisch',
    date: 'Datum JJJJMMTT', d: 'Datum JJJJMMTT', f: 'Zahl (Dezimalpunkt)',
};

export function registerHover(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerHoverProvider(SELECTOR, { provideHover }));
}

function objectPath(obj: XdtObject | undefined, a: ReturnType<typeof getAnalysis>, line: number): string {
    const rec = a.recordAt[line];
    if (!rec) { return ''; }
    const dict = dictionary(a.profile);
    const parts = [`Satz ${rec.type}`];
    // walk down the tree to collect the chain containing `obj`
    const chain: XdtObject[] = [];
    const find = (list: XdtObject[]): boolean => {
        for (const o of list) {
            chain.push(o);
            if (o === obj || find(o.children)) { return true; }
            chain.pop();
        }
        return false;
    };
    if (obj) { find(rec.objects); }
    for (const o of chain) { parts.push(dict.objectName(o.id) ?? o.id); }
    return parts.join(' › ');
}

function provideHover(doc: vscode.TextDocument, pos: vscode.Position): vscode.Hover | undefined {
    const a = getAnalysis(doc);
    const l = a.lines[pos.line];
    if (!l || !l.ok) { return undefined; }
    const dict = dictionary(a.profile);
    const md = new vscode.MarkdownString();
    md.supportHtml = false;
    const col = pos.character;

    if (col < 3) {
        const want = pad3(expectedLength(l.content));
        md.appendMarkdown(`**Feldlänge** \`${l.lenStr}\`  \n`);
        md.appendMarkdown(l.lenStr === want
            ? `✔ korrekt (Inhalt ${l.content.length} Byte + 9)`
            : `✘ erwartet \`${want}\` (Inhalt ${l.content.length} Byte + 3 Länge + 4 FK + 2 CR/LF)`);
        return new vscode.Hover(md, new vscode.Range(pos.line, 0, pos.line, 3));
    }

    const resolved = dict.field(l.fk);
    const def = resolved?.def;

    if (col < 7) {
        md.appendMarkdown(`**FK ${l.fk}** – ${def ? def.name : '_unbekannt_'}  \n`);
        if (def) {
            const meta: string[] = [];
            const spec = parseLen(def.len);
            if (spec) { meta.push(`Länge ${describeLen(spec)}`); }
            if (def.type && TYPE_LABEL[def.type]) { meta.push(TYPE_LABEL[def.type]); }
            if (meta.length) { md.appendMarkdown(meta.join(' · ') + '  \n'); }
            if (def.obj) {
                md.appendMarkdown(`Objektattribut → **${def.obj}** (${dict.objectName(def.obj) ?? '?'})  \n`);
            }
            if (def.rules?.length) {
                md.appendMarkdown('\n');
                for (const r of def.rules) {
                    const text = dict.rule(r);
                    md.appendMarkdown(text ? `- \`${r}\` ${text}\n` : '');
                }
                const unexplained = def.rules.filter(r => !dict.rule(r));
                if (unexplained.length) { md.appendMarkdown(`\nRegeln: ${unexplained.join(', ')}\n`); }
            }
            md.appendMarkdown(`\n_${resolved!.source}_`);
        }
        const path = objectPath(a.objectAt[pos.line], a, pos.line);
        if (path) { md.appendMarkdown(`\n\n${path}`); }
        return new vscode.Hover(md, new vscode.Range(pos.line, 3, pos.line, 7));
    }

    // base64 attachment
    if (l.fk === '6329') {
        const att = attachmentAt(doc, pos.line);
        if (att) {
            const args = encodeURIComponent(JSON.stringify([doc.uri.toString(), att.start]));
            md.isTrusted = { enabledCommands: ['xdt.openAttachment', 'xdt.saveAttachment', 'xdt.foldAttachments'] };
            md.supportThemeIcons = true;
            md.appendMarkdown(`**Base64-Anhang** – ${attachmentLabel(doc, att)}  \n`);
            md.appendMarkdown(`Zeile ${pos.line - att.start + 1} von ${att.lineCount} (Zeilen ${att.start + 1}–${att.end + 1})\n\n`);
            md.appendMarkdown(`[$(eye) Anzeigen](command:xdt.openAttachment?${args}) · [$(save) Speichern unter …](command:xdt.saveAttachment?${args}) · [$(fold) Einklappen](command:xdt.foldAttachments?${encodeURIComponent(JSON.stringify([doc.uri.toString()]))})`);
            return new vscode.Hover(md, new vscode.Range(pos.line, 7, pos.line, l.text.length));
        }
    }

    // content
    const v = l.content;
    let info: string | undefined;
    if (l.fk === '8000' || l.fk === '8001') {
        info = dict.recordType(v) ? `Satzart **${v}** – ${dict.recordType(v)}` : `Satzart ${v} (unbekannt)`;
    } else if (l.fk === '8002' || l.fk === '8003') {
        info = `${l.fk === '8002' ? 'Beginn' : 'Ende'} **${v}** – ${dict.objectName(v) ?? 'unbekanntes Objekt'}`;
    } else if (def?.values && v in def.values) {
        info = `\`${v}\` = ${def.values[v]}`;
    } else if (def?.check === 'date' || def?.check === 'birthdate' || def?.check === 'dateLoose' || def?.type === 'd' || def?.type === 'date') {
        if (/^\d{8}$/.test(v)) { info = `${v.slice(6, 8)}.${v.slice(4, 6)}.${v.slice(0, 4)}`; }
    } else if (def?.check === 'time' && /^\d{6}/.test(v)) {
        info = `${v.slice(0, 2)}:${v.slice(2, 4)}:${v.slice(4, 6)}${v.length > 6 ? '.' + v.slice(6) : ''} Uhr`;
    } else if (def?.check === 'quarter' && /^\d{5}$/.test(v)) {
        info = `${v[0]}. Quartal ${v.slice(1)}`;
    }
    if (!info && !def) { return undefined; }
    md.appendMarkdown(info ?? `${def!.name}`);
    if (info && def && l.fk !== '8000') { md.appendMarkdown(`  \n_${def.name}_`); }
    md.appendMarkdown(`  \n${v.length} Zeichen · ${profileLabel(a.profile)}`);
    return new vscode.Hover(md, new vscode.Range(pos.line, 7, pos.line, l.text.length));
}
