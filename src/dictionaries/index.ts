import { Dictionary, FieldDef, Profile, ResolvedField } from '../core/types';
import { table, withValues, BOOL01, SEX } from './table';
import { ldtFields, ldtObjects, ldtRecordTypes, ldtRules } from './ldt';
import { kvdtFields, kvdtRecordTypes, kvdtRules } from './kvdt';
import * as GdtDe from './gdtLegacyDe';
import * as GdtEn from './gdtLegacyEn';

/**
 * GDT 3.5 – nur die Felder, die nicht aus dem LDT stammen (Kap. 11 der GDT-3.5-Satzbeschreibung)
 * sowie GDT-spezifische Objektattribute (Obj_0012, Obj_0033, Obj_0057).
 * Alles andere wird laut Spezifikation aus der aktuellen LDT-Datensatzbeschreibung übernommen.
 */
const GDT35 = withValues(table(`
0001|Version der Datensatzbeschreibung|<=12|alnum|
6205|Aktuelle Diagnose||alnum|
6210|Medikament verordnet auf Rezept||alnum|
6211|Außerhalb Rezepts verordnetes Medikament||alnum|
6218|Angabe zu Einnahme||alnum|
6220|Befund||alnum|
6221|Fremdbefund||alnum|
6227|Kommentar||alnum|
6406|Gebührenfrei|1|num|
6407|Noctu|1|num|
6408|BGV|1|num|
6409|Unfall|1|num|
6431|Aut Idem|1|num|
8112|Anforderung||alnum||Obj_0012
8133|Kopfdaten_GDT||alnum||Obj_0033
8157|Untersuchungsergebnis_GDT||alnum||Obj_0057
8314|Anforderungs-UID||alnum|
8402|Geräte- und verfahrensspezifisches Kennfeld||alnum|
8404|Unterkategorie zur KF 8402||alnum|
8408|Studie-UID||alnum|
8409|Bezeichnung eines Untersuchungsgangs||alnum|
9206|Verwendeter Zeichensatz|1|num|
`), {
    '6406': [BOOL01, true], '6407': [BOOL01, true], '6408': [BOOL01, true], '6409': [BOOL01, true], '6431': [BOOL01, true],
    '9206': [{ '1': '7-Bit', '2': 'IBM-Zeichensatz (CP437)', '3': 'ISO 8859-15 (GDT 3.5) / ISO 8859-1' }, false],
    '3110': [SEX, false],
});
GDT35['8310'] = { fk: '8310', name: 'Anforderungs-Ident (GDT)', len: '<=60', type: 'alnum' };

export const gdtRecordTypes: Record<string, string> = { ...GdtDe.recordTypes };
GDT35['8000'] = { fk: '8000', name: 'Satzidentifikation', len: '4', type: 'num', values: gdtRecordTypes, closed: true };
GDT35['8001'] = { fk: '8001', name: 'Satzende', len: '4', type: 'num', values: gdtRecordTypes, closed: true };
const gdtRecordTypesEn: Record<string, string> = { ...GdtEn.recordTypes };

const gdtObjects: Record<string, string> = {
    Obj_0012: 'Anforderung (GDT)',
    Obj_0033: 'Kopfdaten_GDT',
    Obj_0057: 'Untersuchungsergebnis_GDT',
};

function legacyGdt(language: string): Record<string, FieldDef> {
    const src = language === 'English' ? GdtEn.fieldIdentifiers : GdtDe.fieldIdentifiers;
    const out: Record<string, FieldDef> = {};
    for (const [fk, name] of Object.entries(src)) { out[fk] = { fk, name }; }
    return out;
}

interface Layer { fields: Record<string, FieldDef>; validate: boolean; source: string }

export interface DictionaryOptions {
    language: string;
    customFields: Record<string, string>;
    customRecordTypes: Record<string, string>;
}

export function createDictionary(profile: Profile, opts: DictionaryOptions): Dictionary {
    const custom: Layer = {
        fields: Object.fromEntries(Object.entries(opts.customFields).map(([fk, name]) => [fk, { fk, name }])),
        validate: false, source: 'Benutzerdefiniert',
    };
    const L = (fields: Record<string, FieldDef>, validate: boolean, source: string): Layer => ({ fields, validate, source });

    let layers: Layer[];
    let records: Record<string, string>;
    let objects: Record<string, string> = {};
    let rules: Record<string, string> = {};

    switch (profile) {
        case 'gdt3':
            layers = [custom, L(GDT35, true, 'GDT 3.5'), L(ldtFields, true, 'LDT 3.2.20 (via GDT 3.5)'), L(legacyGdt(opts.language), false, 'GDT 2.x')];
            records = opts.language === 'English' ? gdtRecordTypesEn : gdtRecordTypes;
            objects = { ...ldtObjects, ...gdtObjects };
            rules = ldtRules;
            break;
        case 'gdt2':
            layers = [custom, L(legacyGdt(opts.language), false, 'GDT 2.x'), L(GDT35, false, 'GDT 3.5'), L(ldtFields, false, 'LDT 3')];
            records = opts.language === 'English' ? gdtRecordTypesEn : gdtRecordTypes;
            break;
        case 'ldt3':
            layers = [custom, L(ldtFields, true, 'LDT 3.2.20')];
            records = ldtRecordTypes;
            objects = ldtObjects;
            rules = ldtRules;
            break;
        case 'ldt2':
            layers = [custom, L({ '8100': { fk: '8100', name: 'Satzlänge' }, '9212': { fk: '9212', name: 'Version der Satzbeschreibung' } }, false, 'LDT 2'),
                L(ldtFields, false, 'LDT 3 (nur Bezeichnung)')];
            records = ldtRecordTypes;
            break;
        case 'kvdt':
            layers = [custom, L(kvdtFields, true, 'KVDT 6.09')];
            records = kvdtRecordTypes;
            rules = kvdtRules;
            break;
    }
    records = { ...records, ...opts.customRecordTypes };

    return {
        profile,
        field(fk: string): ResolvedField | undefined {
            for (const layer of layers) {
                const def = layer.fields[fk];
                if (def) { return { def, validate: layer.validate, source: layer.source }; }
            }
            return undefined;
        },
        recordType: t => records[t],
        objectName: id => objects[id],
        rule: id => rules[id],
        allFields() {
            const seen = new Map<string, FieldDef>();
            for (const layer of [...layers].reverse()) {
                for (const def of Object.values(layer.fields)) { seen.set(def.fk, def); }
            }
            return [...seen.values()].sort((a, b) => a.fk.localeCompare(b.fk));
        },
    };
}
