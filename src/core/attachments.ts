import type { ParsedLine, XdtObject } from './analyzer';
import type { Problem } from './types';

/** A run of consecutive FK 6329 lines ("Inhalt der Datei als base64-kodierte Anlage") */
export interface Attachment {
    start: number;
    end: number;
    lineCount: number;
    base64Length: number;
    byteSize: number;
    /** FK 6303 (Dateiformat) of the enclosing Obj_0010, e.g. "PDF" */
    format?: string;
    /** FK 9970 (Dokumententyp) of the enclosing Obj_0010, e.g. "100", "900" */
    docType?: string;
    /** FK 6327 / 6305 description or file reference, if present */
    description?: string;
    /** line of the 8110 attribute (or 8002 of Obj_0010) – where code lenses are shown */
    anchor: number;
}

export type AttachmentKind = 'pdf' | 'image' | 'xdt' | 'text' | 'binary';

export interface Sniffed {
    kind: AttachmentKind;
    ext: string;
    label: string;
    /** VS Code language id for text-like content */
    language?: string;
}

const B64_LINE = /^[A-Za-z0-9+/]*={0,2}$/;

export function findAttachments(
    lines: ParsedLine[],
    objectAt: (XdtObject | undefined)[],
    push?: (p: Problem) => void,
): Attachment[] {
    const out: Attachment[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].ok || lines[i].fk !== '6329') { continue; }
        const start = i;
        let b64Length = 0;
        let padding = 0;
        let badLine = -1;
        let paddingInMiddle = -1;
        while (i < lines.length && lines[i].ok && lines[i].fk === '6329') {
            const c = lines[i].content;
            if (badLine < 0 && !B64_LINE.test(c)) { badLine = i; }
            if (padding > 0 && paddingInMiddle < 0) { paddingInMiddle = i; }
            const m = /=+$/.exec(c);
            padding = m ? m[0].length : 0;
            b64Length += c.length;
            i++;
        }
        const end = i - 1;
        i = end;

        // enclosing Obj_0010 (Anhang): walk up from the object of the first base64 line
        let container: XdtObject | undefined = objectAt[start];
        while (container && container.id !== 'Obj_0010') { container = container.parent; }
        const att: Attachment = {
            start, end, lineCount: end - start + 1, base64Length: b64Length,
            byteSize: Math.max(0, Math.floor(b64Length * 3 / 4) - padding),
            anchor: start,
        };
        const from = container ? container.start : Math.max(0, start - 8);
        const to = container ? container.end : Math.min(lines.length - 1, end + 4);
        for (let k = from; k <= to; k++) {
            if (k >= start && k <= end) { continue; }
            const l = lines[k];
            if (!l?.ok) { continue; }
            if (l.fk === '6303' && !att.format) { att.format = l.content.trim(); }
            if (l.fk === '9970' && !att.docType) { att.docType = l.content.trim(); }
            if ((l.fk === '6327' || l.fk === '6305') && !att.description) { att.description = l.content.trim(); }
        }
        if (container) {
            att.anchor = container.attrLine ?? container.start;
        } else if (start > 1 && lines[start - 1]?.fk === '8002' && lines[start - 2]?.fk === '8242') {
            att.anchor = start - 2;
        }

        if (push) {
            const P = (line: number, message: string, severity: Problem['severity'] = 'warning') =>
                push({ line, startCol: 7, endCol: 7 + (lines[line]?.content.length ?? 0), severity, code: 'base64', message });
            if (badLine >= 0) {
                P(badLine, 'Ungültiges Zeichen für Base64 (erlaubt: A–Z, a–z, 0–9, +, /, = am Ende)');
            } else if (paddingInMiddle >= 0) {
                P(paddingInMiddle, 'Base64-Füllzeichen „=“ mitten im Anhang – Zeilen fehlen oder sind vertauscht');
            } else if (b64Length % 4 !== 0) {
                P(end, `Base64-Inhalt ist unvollständig (Länge ${b64Length} ist kein Vielfaches von 4)`);
            }
        }
        out.push(att);
    }
    return out;
}

export function decodeAttachment(lines: ParsedLine[], att: Attachment): Buffer {
    const parts: string[] = [];
    for (let k = att.start; k <= att.end; k++) { parts.push(lines[k].content); }
    return Buffer.from(parts.join(''), 'base64');
}

/** Determine the real file type from the first bytes; 6303 is used as fallback */
export function sniff(buf: Buffer, format?: string): Sniffed {
    const head = buf.subarray(0, 16);
    const ascii = head.toString('latin1');
    if (ascii.startsWith('%PDF')) { return { kind: 'pdf', ext: 'pdf', label: 'PDF' }; }
    if (head[0] === 0x89 && ascii.slice(1, 4) === 'PNG') { return { kind: 'image', ext: 'png', label: 'PNG-Bild' }; }
    if (head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF) { return { kind: 'image', ext: 'jpg', label: 'JPEG-Bild' }; }
    if (ascii.startsWith('GIF8')) { return { kind: 'image', ext: 'gif', label: 'GIF-Bild' }; }
    if (ascii.startsWith('BM')) { return { kind: 'image', ext: 'bmp', label: 'BMP-Bild' }; }
    if (ascii.startsWith('II*\0') || ascii.startsWith('MM\0*')) { return { kind: 'binary', ext: 'tif', label: 'TIFF-Bild' }; }
    if (ascii.startsWith('PK\x03\x04')) { return { kind: 'binary', ext: 'zip', label: 'ZIP-Archiv' }; }
    if (ascii.startsWith('\xD0\xCF\x11\xE0')) { return { kind: 'binary', ext: 'doc', label: 'MS-Office-Dokument (alt)' }; }
    if (buf.subarray(128, 132).toString('latin1') === 'DICM') { return { kind: 'binary', ext: 'dcm', label: 'DICOM' }; }

    const text = buf.subarray(0, 2048).toString('latin1');
    const m = /^\d{3}8000(\w{4,5})/.exec(text);
    if (m) {
        const t = m[1];
        const language = /^(8220|8230|8205|8215)$/.test(t) ? 'ldt' : /^63\d\d$/.test(t) ? 'gdt' : /^(con0|adt0|besa)$/.test(t) ? 'kvdt' : 'ldt';
        return { kind: 'xdt', ext: language === 'kvdt' ? 'con' : language, label: `${language.toUpperCase()}-Datei`, language };
    }
    if (/^\s*<\?xml|^\s*<[A-Za-z]/.test(text)) { return { kind: 'text', ext: 'xml', label: 'XML', language: 'xml' }; }
    if (text.startsWith('MSH|')) { return { kind: 'text', ext: 'hl7', label: 'HL7 v2', language: 'plaintext' }; }
    if (/^\s*[{[]/.test(text) && isPrintable(text)) { return { kind: 'text', ext: 'json', label: 'JSON', language: 'json' }; }
    if (isPrintable(text)) { return { kind: 'text', ext: 'txt', label: format ? `${format} (Text)` : 'Text', language: 'plaintext' }; }

    const ext = (format ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    return { kind: 'binary', ext, label: format ?? 'Binärdatei' };
}

function isPrintable(s: string): boolean {
    let bad = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c < 9 || (c > 13 && c < 32) || (c >= 0x7F && c < 0xA0)) { bad++; }
    }
    return bad <= s.length / 100;
}

export function formatBytes(n: number): string {
    if (n < 1024) { return `${n} B`; }
    if (n < 1024 * 1024) { return `${(n / 1024).toFixed(1).replace('.', ',')} KB`; }
    return `${(n / 1024 / 1024).toFixed(2).replace('.', ',')} MB`;
}

/* ------------------------------------------------------------------ */
/* ISO 8859-15                                                         */
/* ------------------------------------------------------------------ */

const TO_15: Record<number, number> = { 0x20AC: 0xA4, 0x160: 0xA6, 0x161: 0xA8, 0x17D: 0xB4, 0x17E: 0xB8, 0x152: 0xBC, 0x153: 0xBD, 0x178: 0xBE };
const FROM_15: Record<number, number> = Object.fromEntries(Object.entries(TO_15).map(([u, b]) => [b, +u]));

export function encodeIso885915(s: string): Buffer {
    const out = Buffer.alloc(s.length);
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        out[i] = TO_15[c] ?? (c <= 0xFF ? c : 0x3F);
    }
    return out;
}

export function decodeIso885915(buf: Buffer): string {
    let s = '';
    const chunk = 8192;
    for (let i = 0; i < buf.length; i += chunk) {
        const part = buf.subarray(i, i + chunk);
        s += String.fromCharCode(...Array.from(part, b => FROM_15[b] ?? b));
    }
    return s;
}
