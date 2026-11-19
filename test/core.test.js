// Node-only tests for the vscode-independent core (run: npm test)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { analyze, computeLengthFixes } = require('../out/core/analyzer');
const { createDictionary } = require('../out/dictionaries');
const { lanrCheckDigit, kvnrCheckDigit, runCheck } = require('../out/core/checks');
const { decodeAttachment, sniff } = require('../out/core/attachments');

const opts = { validate: true, fieldFormat: true, checksums: true, unknownFields: 'hint' };
const mk = p => createDictionary(p, { language: 'German', customFields: {}, customRecordTypes: {} });
const read = f => fs.readFileSync(path.join(__dirname, '..', 'samples', f)).toString('latin1').split('\r\n');
const run = (texts, dialect) => analyze(texts, dialect, mk, opts);
const serious = a => a.problems.filter(p => p.severity === 'error' || p.severity === 'warning');
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✔ ' + name); };

console.log('samples');
for (const [file, dialect, profile] of [
    ['GDT35_6310_Langzeit-RR.gdt', 'gdt', 'gdt3'],
    ['GDT21_6301_Stammdaten.gdt', 'gdt', 'gdt2'],
    ['Z01_LDT3_Befund.ldt', 'ldt', 'ldt3'],
    ['Z01123456700_19.11.2026_10.00.con', 'kvdt', 'kvdt'],
]) {
    test(`${file} → ${profile}, keine Fehler/Warnungen`, () => {
        const a = run(read(file), dialect);
        assert.strictEqual(a.profile, profile);
        assert.deepStrictEqual(serious(a), []);
        assert.deepStrictEqual(computeLengthFixes(a), []);
    });
}

console.log('struktur');
const ldt = read('Z01_LDT3_Befund.ldt');
test('Objektbaum LDT', () => {
    const a = run(ldt, 'ldt');
    assert.strictEqual(a.records.length, 3);
    assert.deepStrictEqual(a.records.map(r => r.type), ['8220', '8205', '8221']);
    const kopf = a.records[0].objects[0];
    assert.strictEqual(kopf.id, 'Obj_0032');
    assert.deepStrictEqual(kopf.children.map(o => o.id), ['Obj_0051', 'Obj_0054']);
    assert.strictEqual(a.version, 'LDT3.2.20');
});
test('falsche Feldlänge + Quick-Fix', () => {
    const t = [...ldt]; t[3] = '0990001LDT3.2.20';
    const a = run(t, 'ldt');
    const p = a.problems.find(p => p.code === 'length');
    assert.ok(p && p.line === 3 && p.fix.text === '018');
});
test('Objektende passt nicht', () => {
    const t = [...ldt]; const i = t.indexOf('0178003Obj_0051'); t[i] = '0178003Obj_0099';
    assert.ok(run(t, 'ldt').problems.some(p => p.code === 'objectEndMismatch'));
});
test('fehlendes 8001', () => {
    const t = ldt.filter(l => l !== '01380018205');
    assert.ok(run(t, 'ldt').problems.some(p => p.code === 'recordUnclosed'));
});
test('Objektattribut ohne Objekt', () => {
    const t = [...ldt]; t.splice(1, 0, '0168145Patient');
    assert.ok(run(t, 'ldt').problems.some(p => p.code === 'attrNoObject'));
});
test('Zeichen außerhalb ISO 8859-15', () => {
    const t = [...ldt]; t[3] = '0180001LDT3.2.2–';
    assert.ok(run(t, 'ldt').problems.some(p => p.code === 'charset'));
});
test('Mojibake-Erkennung', () => {
    const t = [...ldt]; const i = t.findIndex(l => l.includes('Musterstra')); t[i] = '0223107MusterstraÃŸe';
    assert.ok(run(t, 'ldt').problems.some(p => p.code === 'mojibake'));
});
test('Geschlossener Wertebereich (8401)', () => {
    const t = [...ldt]; const i = t.indexOf('01084012'); t[i] = '01084019';
    assert.ok(run(t, 'ldt').problems.some(p => p.code === 'fieldValue'));
});

test('Prüfsumme 9300 korrekt, falsch erkannt, Fix', () => {
    const t = [...ldt]; const i = t.findIndex(l => l.includes('Musterhausen')); t[i] = t[i].replace('Musterhausen', 'Musterdorf12');
    const a = run(t, 'ldt');
    assert.ok(a.problems.some(p => p.code === 'checksum'));
    const fixed = [...t]; for (const f of computeLengthFixes(a)) { fixed[f.line] = f.text; }
    assert.deepStrictEqual(serious(run(fixed, 'ldt')), []);
});
test('Base64-Anhang erkannt und dekodiert', () => {
    const a = run(ldt, 'ldt');
    assert.strictEqual(a.attachments.length, 1);
    const att = a.attachments[0];
    assert.strictEqual(att.format, 'TXT');
    const buf = decodeAttachment(a.lines, att);
    assert.strictEqual(buf.length, att.byteSize);
    assert.ok(buf.toString('latin1').startsWith('Befund Natrium'));
    assert.strictEqual(sniff(buf, att.format).kind, 'text');
});
test('Base64 beschädigt', () => {
    const t = [...ldt]; const i = t.findIndex(l => l.slice(3, 7) === '6329'); t[i] = t[i].slice(0, 20) + '#' + t[i].slice(21);
    assert.ok(run(t, 'ldt').problems.some(p => p.code === 'base64'));
});

// optional: KBV-Testdateien (nicht im Repo) – XDT_KBV_TESTDATA=/pfad/zum/ordner npm test
if (process.env.XDT_KBV_TESTDATA) {
    console.log('kbv-testdateien');
    const dir = process.env.XDT_KBV_TESTDATA;
    for (const f of fs.readdirSync(dir).filter(f => /\.ldt$/i.test(f))) {
        test(f, () => {
            const t = fs.readFileSync(path.join(dir, f)).toString('latin1').split('\r\n');
            const a = run(t, 'ldt');
            assert.deepStrictEqual(serious(a).map(p => `${p.line + 1} ${p.code}`), []);
            for (const att of a.attachments) { assert.strictEqual(decodeAttachment(a.lines, att).length, att.byteSize); }
        });
    }
}

console.log('gdt 2.x satzlänge');
test('Satzlänge 8100 falsch + Fix', () => {
    const t = read('GDT21_6301_Stammdaten.gdt'); t[6] = '0163101Müllerin';
    const a = run(t, 'gdt');
    assert.ok(a.problems.some(p => p.code === 'recordLength'));
    const fixes = computeLengthFixes(a);
    assert.deepStrictEqual(fixes.map(f => f.line), [1, 6]);
    assert.strictEqual(fixes[1].text, '0173101Müllerin');
});

console.log('kvdt');
const con = read('Z01123456700_19.11.2026_10.00.con');
test('LANR-Prüfziffer', () => {
    const t = [...con]; const i = t.indexOf('0185099123456601'); t[i] = '0185099123457601';
    assert.ok(run(t, 'kvdt').problems.some(p => p.code === 'fieldFormat' && /Prüfziffer/.test(p.message)));
});
test('Scheinuntergruppe unzulässig', () => {
    const t = [...con]; const i = t.indexOf('011423900'); t[i] = '011423999';
    assert.ok(run(t, 'kvdt').problems.some(p => p.code === 'fieldValue'));
});
test('Container ohne con9', () => {
    const t = con.filter(l => l !== '0138000con9');
    assert.ok(run(t, 'kvdt').problems.some(p => p.code === 'envelope'));
});

console.log('prüfziffern / formate');
test('LANR 123456699 (KBV-Beispiel)', () => assert.strictEqual(lanrCheckDigit('123456699'), 6));
test('Versicherten-ID A123456780, T555558879, S040464113', () => {
    assert.strictEqual(kvnrCheckDigit('A123456780'), 0);
    assert.strictEqual(kvnrCheckDigit('T555558879'), 9);
    assert.strictEqual(kvnrCheckDigit('S040464113'), 3);
});
test('Geburtsdatum 19450000 erlaubt, 19450231 nicht', () => {
    assert.strictEqual(runCheck('birthdate', '19450000', true), undefined);
    assert.ok(runCheck('birthdate', '19450231', true));
});
test('Uhrzeit mit Millisekunden', () => assert.strictEqual(runCheck('time', '173510123', true), undefined));

console.log(`\n${n} Tests bestanden`);
