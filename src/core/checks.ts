import { CheckKind } from './types';

/* ------------------------------------------------------------------ */
/* Length specs                                                        */
/* ------------------------------------------------------------------ */

export interface LengthSpec { raw: string; min?: number; max?: number; set?: number[] }

/** "9" | "<=60" | "6-12" | "3,5,6" | "" / "var" */
export function parseLen(raw?: string): LengthSpec | undefined {
    if (!raw) { return undefined; }
    const s = raw.replace(/\s/g, '');
    if (s === '' || /^var$/i.test(s)) { return undefined; }
    let m: RegExpExecArray | null;
    if ((m = /^<=(\d+)$/.exec(s))) { return { raw, max: +m[1] }; }
    if ((m = /^(\d+)-(\d+)$/.exec(s))) { return { raw, min: +m[1], max: +m[2] }; }
    if (/^\d+(,\d+)+$/.test(s)) { return { raw, set: s.split(',').map(Number) }; }
    if (/^\d+$/.test(s)) { return { raw, set: [+s] }; }
    return undefined;
}

export function lenOk(spec: LengthSpec, n: number): boolean {
    if (spec.set) { return spec.set.includes(n); }
    if (spec.min !== undefined && n < spec.min) { return false; }
    if (spec.max !== undefined && n > spec.max) { return false; }
    return true;
}

export function describeLen(spec: LengthSpec): string {
    if (spec.set) { return spec.set.length === 1 ? `genau ${spec.set[0]}` : `eine von ${spec.set.join(', ')}`; }
    if (spec.min !== undefined) { return `${spec.min}–${spec.max}`; }
    return `max. ${spec.max}`;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** returns an error message or undefined */
export function checkType(type: string | undefined, value: string): string | undefined {
    switch (type) {
        case 'num': case 'n':
            return /^\d+$/.test(value) ? undefined : 'numerischer Inhalt erwartet';
        case 'date': case 'd':
            return isDate(value) ? undefined : 'Datum im Format JJJJMMTT erwartet';
        case 'f':
            return /^-?\d+(\.\d+)?$/.test(value) ? undefined : 'Zahl mit Punkt als Dezimaltrenner erwartet (z.B. 15.1)';
        default:
            return undefined;
    }
}

/* ------------------------------------------------------------------ */
/* Semantic checks                                                     */
/* ------------------------------------------------------------------ */

export function isDate(v: string, allowZeroDay = false, allowZeroMonth = false, allowAllZero = false): boolean {
    if (!/^\d{8}$/.test(v)) { return false; }
    if (allowAllZero && v === '00000000') { return true; }
    const y = +v.slice(0, 4), m = +v.slice(4, 6), d = +v.slice(6, 8);
    if (y < 1) { return false; }
    if (m === 0) { return allowZeroMonth && d === 0; }
    if (m > 12) { return false; }
    if (d === 0) { return allowZeroDay; }
    return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** LANR: digits 1–6 weighted 4/9, check digit = (10 - sum mod 10) mod 10 */
export function lanrCheckDigit(lanr: string): number {
    let sum = 0;
    for (let i = 0; i < 6; i++) { sum += +lanr[i] * (i % 2 === 0 ? 4 : 9); }
    return (10 - (sum % 10)) % 10;
}

/**
 * Versicherten-ID (eGK): letter -> 01..26, weights 1/2, cross sums; check digit = sum mod 10.
 * (Verified against the KBV LDT test files and T555558879 – the wording "Differenz zu 10" in the LDT
 * field table does not match real data.)
 */
export function kvnrCheckDigit(kvnr: string): number {
    const letter = kvnr.charCodeAt(0) - 64;
    const digits = (letter < 10 ? '0' + letter : '' + letter) + kvnr.slice(1, 9);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        const p = +digits[i] * (i % 2 === 0 ? 1 : 2);
        sum += p > 9 ? p - 9 : p;
    }
    return sum % 10;
}

const KV_PREFIXES = new Set<string>();
(() => {
    const add = (a: number, b = a) => { for (let i = a; i <= b; i++) { KV_PREFIXES.add(String(i).padStart(2, '0')); } };
    add(1, 3); add(6, 21); add(24); add(25); add(27); add(28); add(31); add(37, 73);
    add(78, 81); add(83); add(85, 88); add(93, 96); add(98); add(99);
    add(35); add(74); // Terminservicestelle-KH / SAPV
})();

export function runCheck(kind: CheckKind, v: string, withChecksums: boolean): string | undefined {
    switch (kind) {
        case 'date': return isDate(v) ? undefined : 'kein gültiges Datum (JJJJMMTT)';
        case 'birthdate': return isDate(v, true, true, true) ? undefined : 'kein gültiges Geburtsdatum (JJJJMMTT, erlaubt auch JJJJMM00/JJJJ0000/00000000)';
        case 'dateLoose': return isDate(v, true, true) ? undefined : 'kein gültiges Datum (JJJJMMTT, erlaubt auch JJJJMM00/JJJJ0000)';
        case 'dateRange':
            return /^\d{16}$/.test(v) && isDate(v.slice(0, 8)) && isDate(v.slice(8)) && v.slice(0, 8) <= v.slice(8)
                ? undefined : 'Zeitraum im Format JJJJMMTTJJJJMMTT erwartet (von ≤ bis)';
        case 'time': return /^([01]\d|2[0-3])[0-5]\d[0-5]\d(\d{3})?$/.test(v) ? undefined : 'Uhrzeit hhmmss bzw. hhmmssmmm erwartet';
        case 'hhmm': return /^([01]\d|2[0-3])[0-5]\d$/.test(v) ? undefined : 'Uhrzeit HHMM erwartet';
        case 'timestamp14':
            return /^\d{14}$/.test(v) && isDate(v.slice(0, 8)) && /^([01]\d|2[0-3])[0-5]\d[0-5]\d$/.test(v.slice(8))
                ? undefined : 'Zeitstempel JJJJMMTThhmmss erwartet';
        case 'quarter': return /^[1-4]\d{4}$/.test(v) ? undefined : 'Quartal im Format QJJJJ erwartet';
        case 'icd': return /^[A-Z]\d{2}(\.(\d{1,2}|\d-|-))?$/.test(v) ? undefined : 'ICD-Format ann, ann.n, ann.nn, ann.n- erwartet';
        case 'ldtVersion': return /^LDT\d\.\d{1,2}\.\d{1,4}$/.test(v) ? undefined : 'Format LDTn.n.n erwartet (z.B. LDT3.2.20)';
        case 'lanr':
            if (!/^\d{9}$/.test(v)) { return 'LANR: 9 Ziffern erwartet'; }
            if (/^5{6}/.test(v)) { return 'Pseudo-LANR 555555… ist hier nicht zulässig'; }
            if (v === '999999900') { return undefined; }
            if (withChecksums && +v[6] !== lanrCheckDigit(v)) { return `LANR-Prüfziffer falsch (erwartet ${lanrCheckDigit(v)} an Stelle 7)`; }
            return undefined;
        case 'bsnr':
            if (!/^\d{9}$/.test(v)) { return '(N)BSNR: 9 Ziffern erwartet'; }
            return KV_PREFIXES.has(v.slice(0, 2)) ? undefined : `(N)BSNR: KV-Kennung „${v.slice(0, 2)}“ unbekannt`;
        case 'kvnr':
            if (!/^[A-Z]\d{9}$/.test(v)) { return 'Versicherten-ID: Format annnnnnnnP erwartet'; }
            if (withChecksums && +v[9] !== kvnrCheckDigit(v)) { return `Versicherten-ID-Prüfziffer falsch (erwartet ${kvnrCheckDigit(v)})`; }
            return undefined;
    }
    return undefined;
}

/* ------------------------------------------------------------------ */
/* Character set                                                       */
/* ------------------------------------------------------------------ */

const ISO_8859_15_EXTRA = new Set([0x20AC, 0x160, 0x161, 0x17D, 0x17E, 0x152, 0x153, 0x178]);
const ISO_8859_15_REPLACED = new Set([0xA4, 0xA6, 0xA8, 0xB4, 0xB8, 0xBC, 0xBD, 0xBE]);

/** index of the first character not representable in ISO 8859-15, or -1 */
export function firstInvalidChar(s: string): number {
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x20 && c <= 0x7E) { continue; }
        if (c >= 0xA0 && c <= 0xFF && !ISO_8859_15_REPLACED.has(c)) { continue; }
        if (ISO_8859_15_EXTRA.has(c)) { continue; }
        return i;
    }
    return -1;
}

/** "Ã¼" & co.: UTF-8 bytes decoded as Latin-1/-15 */
export function looksLikeMojibake(s: string): boolean {
    return /[ÃÂ][\u0080-\u00BF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u20AC]/.test(s);
}

export function pad3(n: number): string {
    return n > 999 ? String(n) : String(n).padStart(3, '0');
}
