import { Dialect, Dictionary, Problem, Profile } from './types';
import { createHash } from 'crypto';
import { Attachment, encodeIso885915, findAttachments } from './attachments';
import { checkType, describeLen, firstInvalidChar, lenOk, looksLikeMojibake, pad3, parseLen, runCheck } from './checks';

export interface ParsedLine {
    line: number;
    text: string;
    ok: boolean;
    lenStr: string;
    fk: string;
    content: string;
}

export interface XdtObject {
    id: string;
    /** line of the object attribute (8100–8299) that introduced the object */
    attrLine?: number;
    start: number;  // line of 8002
    end: number;    // line of 8003 (or last line if unclosed)
    depth: number;
    children: XdtObject[];
    parent?: XdtObject;
}

export interface XdtRecord {
    type: string;
    start: number;
    end: number;
    /** true if terminated by 8001 */
    closed: boolean;
    objects: XdtObject[];
}

export interface Analysis {
    dialect: Dialect;
    profile: Profile;
    lines: ParsedLine[];
    records: XdtRecord[];
    problems: Problem[];
    /** version string found in the file (0001 / 9218 / 9212) */
    version?: string;
    /** innermost object per line (for hovers) */
    objectAt: (XdtObject | undefined)[];
    recordAt: (XdtRecord | undefined)[];
    /** base64 attachments (runs of FK 6329) */
    attachments: Attachment[];
}

export interface AnalyzeOptions {
    validate: boolean;
    fieldFormat: boolean;
    checksums: boolean;
    unknownFields: 'off' | 'hint' | 'info';
}

const LINE_RE = /^(\d{3})(\d{4})(.*)$/;

export function parseLines(texts: string[]): ParsedLine[] {
    return texts.map((text, line) => {
        const m = LINE_RE.exec(text);
        return m
            ? { line, text, ok: true, lenStr: m[1], fk: m[2], content: m[3] }
            : { line, text, ok: false, lenStr: '', fk: '', content: '' };
    });
}

export function detectProfile(dialect: Dialect, lines: ParsedLine[]): Profile {
    if (dialect === 'kvdt') { return 'kvdt'; }
    const objectStyle = lines.some(l => l.ok && (l.fk === '0001' || l.fk === '8002'));
    if (dialect === 'ldt') { return objectStyle ? 'ldt3' : 'ldt2'; }
    return objectStyle ? 'gdt3' : 'gdt2';
}

export function isObjectProfile(p: Profile): boolean {
    return p === 'gdt3' || p === 'ldt3';
}

export function expectedLength(content: string): number {
    // ISO 8859-15: one byte per character; +3 length +4 FK +2 CR/LF
    return content.length + 9;
}

export function analyze(texts: string[], dialect: Dialect, makeDict: (p: Profile) => Dictionary, opts: AnalyzeOptions): Analysis {
    const lines = parseLines(texts);
    const profile = detectProfile(dialect, lines);
    const dict = makeDict(profile);
    const problems: Problem[] = [];
    const records: XdtRecord[] = [];
    const objectAt: (XdtObject | undefined)[] = new Array(lines.length).fill(undefined);
    const recordAt: (XdtRecord | undefined)[] = new Array(lines.length).fill(undefined);
    const objMode = isObjectProfile(profile);
    const P = (line: number, startCol: number, endCol: number, severity: Problem['severity'], code: string, message: string, fix?: Problem['fix']) =>
        problems.push({ line, startCol, endCol, severity, code, message, fix });

    let version: string | undefined;
    let rec: XdtRecord | undefined;
    let stack: XdtObject[] = [];
    let pendingAttr: ParsedLine | undefined;

    const closeRecord = (endLine: number, byMarker: boolean) => {
        if (!rec) { return; }
        rec.end = endLine;
        rec.closed = byMarker;
        for (const o of stack) {
            o.end = endLine;
            P(o.start, 7, 7 + o.id.length, 'error', 'objectUnclosed', `Objekt ${o.id} wird nicht mit 8003 abgeschlossen`);
        }
        stack = [];
        rec = undefined;
    };

    // trailing empty line(s) after the final CR/LF are fine
    let lastLine = lines.length - 1;
    while (lastLine >= 0 && lines[lastLine].text === '') { lastLine--; }

    for (let i = 0; i <= lastLine; i++) {
        const l = lines[i];
        recordAt[i] = rec;
        objectAt[i] = stack[stack.length - 1];

        if (!l.ok) {
            if (l.text === '') {
                P(i, 0, 0, 'warning', 'emptyLine', 'Leerzeile ist im xDT-Format nicht zulässig');
            } else {
                P(i, 0, l.text.length, 'error', 'syntax', 'Ungültige Zeile: erwartet werden 3 Ziffern Länge + 4 Ziffern Feldkennung + Inhalt');
            }
            continue;
        }

        /* ---- field length ---- */
        const expected = expectedLength(l.content);
        if (l.lenStr === '000' && profile.startsWith('gdt')) {
            P(i, 0, 3, 'hint', 'lengthUnset', `Länge nicht angegeben (000), korrekt wäre ${pad3(expected)}`,
                { startCol: 0, endCol: 3, text: pad3(expected), title: `Länge ${pad3(expected)} eintragen` });
        } else if (+l.lenStr !== expected) {
            P(i, 0, 3, 'error', 'length', `Feldlänge ${l.lenStr} ist falsch, erwartet ${pad3(expected)} (Inhalt ${l.content.length} + 9)`,
                { startCol: 0, endCol: 3, text: pad3(expected), title: `Länge auf ${pad3(expected)} korrigieren` });
        }

        /* ---- characters ---- */
        const bad = firstInvalidChar(l.content);
        if (looksLikeMojibake(l.content)) {
            P(i, 7, l.text.length, 'warning', 'mojibake', 'Inhalt sieht nach UTF-8 aus, das als ISO 8859-15 gelesen wurde (z.B. „Ã¼“ statt „ü“) – Datei wurde vermutlich falsch kodiert gespeichert');
        } else if (bad >= 0) {
            const ch = l.content[bad];
            const msg = ch === '\uFFFD'
                ? 'Unlesbares Zeichen – Datei vermutlich nicht als ISO 8859-15 geöffnet („Reopen with Encoding“)'
                : `Zeichen „${ch}“ (U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}) ist nicht in ISO 8859-15 enthalten`;
            P(i, 7 + bad, 8 + bad, 'error', 'charset', msg);
        }

        /* ---- empty content ---- */
        if (l.content.trim() === '' && !EMPTY_ALLOWED.has(l.fk)) {
            P(i, 7, Math.max(7, l.text.length), 'warning', 'emptyField', 'Leere Felder (ohne Inhalt bzw. nur Leerzeichen) dürfen nicht übertragen werden');
        }

        /* ---- versions ---- */
        if ((l.fk === '0001' && objMode) || (l.fk === '9218' && profile === 'gdt2') || (l.fk === '9212' && (profile === 'kvdt' || profile === 'ldt2'))) {
            version = version ? (version.includes(l.content) ? version : `${version}, ${l.content}`) : l.content;
        }

        /* ---- structure ---- */
        if (l.fk === '8000') {
            if (rec) {
                if (objMode) {
                    P(rec.start, 7, 7 + rec.type.length, 'error', 'recordUnclosed', `Satz ${rec.type} wird nicht mit 8001 abgeschlossen`);
                }
                closeRecord(i - 1, false);
            }
            rec = { type: l.content, start: i, end: i, closed: false, objects: [] };
            recordAt[i] = rec;
            objectAt[i] = undefined;
            if (opts.validate && !dict.recordType(l.content)) {
                P(i, 7, l.text.length, 'warning', 'recordType', `Unbekannte Satzart „${l.content}“`);
            }
        } else if (l.fk === '8001') {
            if (!rec) {
                P(i, 3, l.text.length, 'error', 'recordEndOrphan', '8001 (Satzende) ohne vorangehendes 8000');
            } else {
                if (l.content !== rec.type) {
                    P(i, 7, l.text.length, 'error', 'recordEndMismatch', `Satzende ${l.content} passt nicht zur Satzart ${rec.type}`,
                        { startCol: 7, endCol: l.text.length, text: rec.type, title: `Satzende auf ${rec.type} setzen` });
                }
                closeRecord(i, true);
            }
        } else if (!rec && l.ok) {
            P(i, 3, 7, 'error', 'outsideRecord', 'Feld außerhalb eines Satzes (kein vorangehendes 8000)');
        }

        if (objMode && rec) {
            if (l.fk === '8002') {
                const obj: XdtObject = { id: l.content, start: i, end: i, depth: stack.length, children: [], parent: stack[stack.length - 1] };
                if (pendingAttr && pendingAttr.line === i - 1) {
                    obj.attrLine = pendingAttr.line;
                    const attrDef = dict.field(pendingAttr.fk)?.def;
                    if (opts.validate && attrDef?.obj && attrDef.obj !== l.content && profile === 'ldt3') {
                        P(i, 7, l.text.length, 'warning', 'objectMismatch', `Objektattribut ${pendingAttr.fk} (${attrDef.attr}) erwartet ${attrDef.obj}, gefunden ${l.content}`);
                    }
                } else if (opts.validate) {
                    P(i, 3, 7, 'info', 'objectNoAttr', 'Objekt ohne vorangehendes Objektattribut (FK 8100–8299)');
                }
                (stack.length ? stack[stack.length - 1].children : rec.objects).push(obj);
                stack.push(obj);
                objectAt[i] = obj;
                if (opts.validate && !dict.objectName(l.content)) {
                    P(i, 7, l.text.length, 'hint', 'objectUnknown', `Objekt ${l.content} ist nicht im Objektkatalog`);
                }
            } else if (l.fk === '8003') {
                const top = stack.pop();
                if (!top) {
                    P(i, 3, l.text.length, 'error', 'objectEndOrphan', '8003 (Objektende) ohne offenes Objekt');
                } else {
                    top.end = i;
                    objectAt[i] = top;
                    if (top.id !== l.content) {
                        P(i, 7, l.text.length, 'error', 'objectEndMismatch', `Objektende ${l.content} passt nicht zu ${top.id} (Zeile ${top.start + 1})`,
                            { startCol: 7, endCol: l.text.length, text: top.id, title: `Objektende auf ${top.id} setzen` });
                    }
                    if (top.start === i - 1) {
                        P(top.start, 0, l.text.length, 'warning', 'objectEmpty', 'Leere Objekte (nur 8002/8003) dürfen nicht übertragen werden');
                    }
                }
            }
            // object attribute: 8100–8299 except structural FKs
            const n = +l.fk;
            if (n >= 8100 && n <= 8299) {
                if (pendingAttr && pendingAttr.line === i - 1) {
                    P(pendingAttr.line, 3, 7, 'warning', 'attrNoObject', `Auf Objektattribut ${pendingAttr.fk} muss ein Objekt (8002) folgen`);
                }
                pendingAttr = l;
            } else if (pendingAttr && pendingAttr.line === i - 1 && l.fk !== '8002') {
                P(pendingAttr.line, 3, 7, 'warning', 'attrNoObject', `Auf Objektattribut ${pendingAttr.fk} muss ein Objekt (8002) folgen`);
            }
        }

        /* ---- field dictionary checks ---- */
        if (opts.validate) {
            validateField(l, dict, opts, profile, P);
        }

        if (l.fk === '8001') { recordAt[i] = records[records.length - 1]; }
        if (rec && l.fk === '8000') { records.push(rec); }
    }

    if (rec) {
        if (objMode) {
            P(rec.start, 7, 7 + rec.type.length, 'error', 'recordUnclosed', `Satz ${rec.type} wird nicht mit 8001 abgeschlossen`);
        }
        closeRecord(lastLine, false);
    }
    if (pendingAttr && pendingAttr.line === lastLine) {
        P(pendingAttr.line, 3, 7, 'warning', 'attrNoObject', `Auf Objektattribut ${pendingAttr.fk} muss ein Objekt (8002) folgen`);
    }

    // recordAt/objectAt for closing lines were set before closing; fix record ranges for lines after loop
    for (const r of records) { for (let k = r.start; k <= r.end; k++) { recordAt[k] = r; } }

    if (opts.validate) {
        checkRecordLength(lines, records, profile, P);
        checkEnvelope(records, profile, lines, P);
    }
    const attachments = findAttachments(lines, objectAt, opts.validate ? p => problems.push(p) : undefined);
    if (opts.validate && opts.checksums && profile === 'ldt3') {
        const c = checksumLine(lines);
        if (c) {
            const want = ldtChecksum(texts, c.line);
            if (c.content.toLowerCase() !== want) {
                P(c.line, 7, c.text.length, 'error', 'checksum', `Prüfsumme (SHA-1) stimmt nicht, erwartet ${want}`,
                    { startCol: 7, endCol: c.text.length, text: want, title: 'Prüfsumme neu berechnen' });
            }
        }
    }

    return { dialect, profile, lines, records, problems, version, objectAt, recordAt, attachments };
}

/** fields that may legitimately be empty (e.g. blank lines inside an Obj_Fließtext) */
const EMPTY_ALLOWED = new Set(['3564']);

function checksumLine(lines: ParsedLine[]): ParsedLine | undefined {
    for (let k = lines.length - 1; k >= 0; k--) {
        if (lines[k].ok && lines[k].fk === '9300') { return lines[k]; }
    }
    return undefined;
}

/**
 * LDT 3 FK 9300: SHA-1 (lower-case hex) over all bytes of the file in ISO 8859-15
 * preceding the 9300 line, including the CR/LF of the previous line.
 * (Verified against all KBV LDT 3.2.20 test files.)
 */
export function ldtChecksum(texts: string[], line: number): string {
    const h = createHash('sha1');
    for (let k = 0; k < line; k++) {
        h.update(encodeIso885915(texts[k]));
        h.update('\r\n');
    }
    return h.digest('hex');
}

type Push = (line: number, s: number, e: number, sev: Problem['severity'], code: string, msg: string, fix?: Problem['fix']) => void;

function validateField(l: ParsedLine, dict: Dictionary, opts: AnalyzeOptions, profile: Profile, P: Push) {
    const resolved = dict.field(l.fk);
    if (!resolved) {
        if (opts.unknownFields !== 'off') {
            P(l.line, 3, 7, opts.unknownFields === 'info' ? 'info' : 'hint', 'unknownField', `Feldkennung ${l.fk} ist im ${profileLabel(profile)}-Wörterbuch nicht bekannt`);
        }
        return;
    }
    if (!resolved.validate || !opts.fieldFormat) { return; }
    const { def } = resolved;
    const v = l.content;
    const s = 7, e = l.text.length;
    if (v.trim() === '') { return; }

    if (def.attr) {
        if (v !== def.attr) {
            P(l.line, s, e, 'hint', 'attrContent', `Objektattribut ${l.fk}: erwarteter Inhalt „${def.attr}“`,
                { startCol: s, endCol: e, text: def.attr, title: `Inhalt auf „${def.attr}“ setzen` });
        }
        return;
    }
    const spec = parseLen(def.len);
    if (spec && !lenOk(spec, v.length)) {
        P(l.line, s, e, 'warning', 'fieldLength', `${def.name}: Länge des Inhalts ${v.length}, erlaubt ${describeLen(spec)}`);
    }
    const typeErr = checkType(def.type, v);
    if (typeErr && !def.check) {
        P(l.line, s, e, 'warning', 'fieldType', `${def.name}: ${typeErr}`);
    }
    if (def.check) {
        const err = runCheck(def.check, v, opts.checksums);
        if (err) { P(l.line, s, e, 'warning', 'fieldFormat', `${def.name}: ${err}`); }
    }
    if (def.values && def.closed && !(v in def.values)) {
        P(l.line, s, e, 'warning', 'fieldValue', `${def.name}: „${v}“ ist kein erlaubter Wert (${Object.keys(def.values).join(', ')})`);
    }
}

/** GDT 2.x / LDT 2.x: FK 8100 "Satzlänge" = Summe aller Feldlängen des Satzes (5-stellig) */
function checkRecordLength(lines: ParsedLine[], records: XdtRecord[], profile: Profile, P: Push) {
    if (profile !== 'gdt2' && profile !== 'ldt2') { return; }
    for (const r of records) {
        let total = 0;
        let lenLine: ParsedLine | undefined;
        for (let k = r.start; k <= r.end; k++) {
            const l = lines[k];
            if (!l.ok) { continue; }
            total += expectedLength(l.content);
            if (l.fk === '8100' && !lenLine) { lenLine = l; }
        }
        if (lenLine && /^\d{5}$/.test(lenLine.content) && +lenLine.content !== total) {
            const want = String(total).padStart(5, '0');
            P(lenLine.line, 7, lenLine.text.length, 'error', 'recordLength', `Satzlänge ${lenLine.content} ist falsch, erwartet ${want}`,
                { startCol: 7, endCol: lenLine.text.length, text: want, title: `Satzlänge auf ${want} korrigieren` });
        }
    }
}

function checkEnvelope(records: XdtRecord[], profile: Profile, lines: ParsedLine[], P: Push) {
    if (!records.length) { return; }
    const first = records[0], last = records[records.length - 1];
    const at = (r: XdtRecord) => [r.start, 7, lines[r.start].text.length] as const;
    if (profile === 'kvdt') {
        if (first.type !== 'con0') { P(...at(first), 'warning', 'envelope', 'Eine KVDT-Datei beginnt mit Satz con0 (Container-Header)'); }
        if (last.type !== 'con9') { P(...at(last), 'warning', 'envelope', 'Eine KVDT-Datei endet mit Satz con9 (Container-Abschluss)'); }
    } else if (profile === 'ldt3') {
        const pairs: Record<string, string> = { '8220': '8221', '8230': '8231' };
        if (!pairs[first.type]) {
            P(...at(first), 'warning', 'envelope', 'Eine LDT-Datei beginnt mit 8220 (Labor) oder 8230 (Praxis)');
        } else if (last.type !== pairs[first.type]) {
            P(...at(last), 'warning', 'envelope', `Datenpaket ${first.type} muss mit Satz ${pairs[first.type]} abgeschlossen werden`);
        }
    }
}

export function profileLabel(p: Profile): string {
    return { gdt2: 'GDT 2.x', gdt3: 'GDT 3.x', ldt2: 'LDT 2.x', ldt3: 'LDT 3', kvdt: 'KVDT' }[p];
}

/** Text edits (line, new full text) that fix all field lengths and – for legacy profiles – the 8100 record length */
export function computeLengthFixes(a: Analysis): { line: number; text: string }[] {
    const out = new Map<number, string>();
    for (const l of a.lines) {
        if (!l.ok) { continue; }
        const want = pad3(expectedLength(l.content));
        if (l.lenStr !== want) { out.set(l.line, want + l.fk + l.content); }
    }
    if (a.profile === 'gdt2' || a.profile === 'ldt2') {
        for (const r of a.records) {
            let total = 0;
            let lenLine: ParsedLine | undefined;
            for (let k = r.start; k <= r.end; k++) {
                const l = a.lines[k];
                if (!l.ok) { continue; }
                total += expectedLength(l.content);
                if (l.fk === '8100' && !lenLine) { lenLine = l; }
            }
            if (lenLine && /^\d{5}$/.test(lenLine.content)) {
                const want = String(total).padStart(5, '0');
                if (want !== lenLine.content) { out.set(lenLine.line, pad3(expectedLength(want)) + '8100' + want); }
            }
        }
    }
    // LDT 3: recompute the SHA-1 checksum over the corrected content
    const c = a.profile === 'ldt3' ? checksumLine(a.lines) : undefined;
    if (c) {
        const texts = a.lines.map(l => out.get(l.line) ?? l.text);
        const want = ldtChecksum(texts, c.line);
        if (want !== c.content) { out.set(c.line, pad3(expectedLength(want)) + '9300' + want); }
    }
    return [...out.entries()].map(([line, text]) => ({ line, text })).sort((x, y) => x.line - y.line);
}
