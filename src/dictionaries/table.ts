import { CheckKind, FieldDef } from '../core/types';

/**
 * Parses a compact field table. One field per line:
 *   FK | Name | Länge | Typ | Regeln (comma separated) | Objekt (attributes only)
 * Lines starting with '#' are comments.
 */
export function table(text: string, ruleChecks: Record<string, CheckKind> = {}): Record<string, FieldDef> {
    const out: Record<string, FieldDef> = {};
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) { continue; }
        const [fk, name, len, type, rules, obj] = line.split('|').map(s => s.trim());
        const def: FieldDef = { fk, name };
        if (len) { def.len = len; }
        if (type) { def.type = type; }
        if (rules) {
            def.rules = rules.split(',').map(r => r.trim()).filter(Boolean);
            for (const r of def.rules) {
                if (ruleChecks[r]) { def.check = ruleChecks[r]; }
            }
        }
        if (obj) {
            def.obj = obj;
            def.attr = name;
        }
        out[fk] = def;
    }
    return out;
}

/** attach value lists: { fk: [values, closed] } */
export function withValues(
    fields: Record<string, FieldDef>,
    values: Record<string, [Record<string, string>, boolean]>,
): Record<string, FieldDef> {
    for (const [fk, [v, closed]] of Object.entries(values)) {
        if (fields[fk]) {
            fields[fk].values = v;
            fields[fk].closed = closed;
        }
    }
    return fields;
}

export const BOOL01 = { '0': 'nein', '1': 'ja' };
export const SEX = { M: 'männlich', W: 'weiblich', U: 'unbekannt', X: 'unbestimmt', D: 'divers' };
export const DIAG_SAFETY = { G: 'gesicherte Diagnose', V: 'Verdacht auf', Z: 'Zustand nach', A: 'Ausschluss' };
export const SIDE = { R: 'rechts', L: 'links', B: 'beidseitig' };
