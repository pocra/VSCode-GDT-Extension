import * as vscode from 'vscode';
import { analyze, Analysis } from '../core/analyzer';
import { Dialect, Dictionary, Profile } from '../core/types';
import { createDictionary } from '../dictionaries';

export const DIALECTS: Dialect[] = ['gdt', 'ldt', 'kvdt'];
export const SELECTOR: vscode.DocumentSelector = DIALECTS.map(language => ({ language }));

export function isXdt(doc: vscode.TextDocument | undefined): doc is vscode.TextDocument {
    return !!doc && (DIALECTS as string[]).includes(doc.languageId);
}

function cfg() { return vscode.workspace.getConfiguration('xdt'); }

export function config() {
    const c = cfg();
    // settings of the original GDT extension are still honoured
    const legacy = vscode.workspace.getConfiguration('gdt');
    return {
        language: c.get<string>('language', 'German'),
        customFields: { ...(legacy.get<Record<string, string>>('CustomFieldIdentifiers') ?? {}), ...c.get<Record<string, string>>('customFieldIdentifiers', {}) },
        customRecordTypes: { ...(legacy.get<Record<string, string>>('CustomRecordTypes') ?? {}), ...c.get<Record<string, string>>('customRecordTypes', {}) },
        validate: c.get<boolean>('validation.enabled', true),
        fieldFormat: c.get<boolean>('validation.fieldFormat', true),
        checksums: c.get<boolean>('validation.checksums', true),
        unknownFields: c.get<'off' | 'hint' | 'info'>('validation.unknownFields', 'hint'),
        fixLengthsOnSave: c.get<boolean>('fixLengthsOnSave', false),
        outlineFields: c.get<boolean>('outline.showFields', false),
        anonymizeFields: c.get<string[]>('anonymize.fields', []),
    };
}

const cache = new Map<string, { version: number; analysis: Analysis }>();
const dictCache = new Map<Profile, Dictionary>();

export function invalidateConfig() {
    cache.clear();
    dictCache.clear();
}

export function dictionary(profile: Profile): Dictionary {
    let d = dictCache.get(profile);
    if (!d) {
        const c = config();
        d = createDictionary(profile, { language: c.language, customFields: c.customFields, customRecordTypes: c.customRecordTypes });
        dictCache.set(profile, d);
    }
    return d;
}

export function getAnalysis(doc: vscode.TextDocument): Analysis {
    const key = doc.uri.toString();
    const hit = cache.get(key);
    if (hit && hit.version === doc.version) { return hit.analysis; }
    const c = config();
    const texts: string[] = [];
    for (let i = 0; i < doc.lineCount; i++) { texts.push(doc.lineAt(i).text); }
    const analysis = analyze(texts, doc.languageId as Dialect, dictionary, {
        validate: c.validate, fieldFormat: c.fieldFormat, checksums: c.checksums, unknownFields: c.unknownFields,
    });
    cache.set(key, { version: doc.version, analysis });
    return analysis;
}

export function forget(doc: vscode.TextDocument) {
    cache.delete(doc.uri.toString());
}
