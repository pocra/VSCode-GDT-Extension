// Generates the sample files in ./samples (ISO 8859-15, CR/LF, correct lengths).
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const line = (fk, content) => String(content.length + 9).padStart(3, '0') + fk + content;
const write = (name, rows) => {
    let lines = rows.map(r => Array.isArray(r) ? line(r[0], r[1]) : r);
    // LDT 3: FK 9300 = SHA-1 over all preceding bytes (ISO 8859-15, incl. CR/LF)
    const k = lines.findIndex(l => l.slice(3, 7) === '9300');
    if (k >= 0) {
        const sha = crypto.createHash('sha1').update(Buffer.from(lines.slice(0, k).join('\r\n') + '\r\n', 'latin1')).digest('hex');
        lines[k] = line('9300', sha);
    }
    const text = lines.join('\r\n') + '\r\n';
    fs.writeFileSync(path.join(__dirname, '..', 'samples', name), Buffer.from(text, 'latin1'));
};
const obj = (attrFk, attr, id, inner) => [[attrFk, attr], ['8002', id], ...inner, ['8003', id]];
const ts = (attrFk, attr, d, t) => obj(attrFk, attr, 'Obj_0054', [['7278', d], ['7279', t], ['7273', 'UTC+2']]);

/* ---------- GDT 3.5 – SA 6310 (Beispiel aus der Satzbeschreibung, Kap. 6.5.3) ---------- */
write('GDT35_6310_Langzeit-RR.gdt', [
    ['8000', '6310'],
    ...obj('8133', 'Kopfdaten_GDT', 'Obj_0033', [['0001', '3.5'], ['8315', 'PRAX_AIS'], ['8316', 'LZBD_SYS']]),
    ...obj('8145', 'Patient', 'Obj_0045', obj('8147', 'Person', 'Obj_0047', [
        ['7420', '12'], ['3101', 'Mustermann'], ['3102', 'Franz'], ['3103', '19451001'], ['3110', 'M']])),
    ...obj('8112', 'Anforderung', 'Obj_0012', [['8310', 'BDM'], ['8314', '47114712'], ['8402', 'BDM_01'], ['8404', 'BDM1']]),
    ...obj('8157', 'Untersuchungsergebnis_GDT', 'Obj_0057', [
        ['8410', 'SYSMXTG'], ['8411', 'Systole max Tagphase'], ['7263', '123456780001245'], ['7264', 'UIDGeraet'],
        ['7306', '01'], ['8420', '142'], ['8419', '2'], ['8421', 'mmHg'],
        ...ts('8225', 'Timestamp_Messung', '19981023', '173510')]),
    ...obj('8167', 'Zusaetzliche_Informationen', 'Obj_0068', [
        ['3564', '6220Dies ist ein zweizeiliger'], ['3564', '6220Befund zur 24h-Blutdruckmessung.']]),
    ...obj('8169', 'Koerperkenngroessen', 'Obj_0069', [['3622', '178'], ['8421', 'cm'], ...ts('8225', 'Timestamp_Messung', '19981023', '173510')]),
    ['8001', '6310'],
]);

/* ---------- GDT 2.1 – SA 6301 mit Satzlänge 8100 ---------- */
const gdt21 = [['8000', '6301'], ['8100', '00000'], ['8315', 'EKG_TYP1'], ['8316', 'PRAX_EDV'], ['9218', '02.10'],
    ['3000', '4711'], ['3101', 'Müller'], ['3102', 'Jürgen'], ['3103', '01101945'], ['3110', '1'], ['3622', '178'], ['3623', '82']];
const total = gdt21.reduce((s, [, c]) => s + c.length + 9, 0);
gdt21[1][1] = String(total).padStart(5, '0');
write('GDT21_6301_Stammdaten.gdt', gdt21);

/* ---------- LDT 3.2.20 – L-Datenpaket (Beispiel aus Kap. 7) + Befund ---------- */
write('Z01_LDT3_Befund.ldt', [
    ['8000', '8220'],
    ...obj('8132', 'Kopfdaten', 'Obj_0032', [
        ['0001', 'LDT3.2.20'],
        ...obj('8151', 'Sendendes_System', 'Obj_0051', [['8316', '4178526'], ['0105', 'X/36/1503/04/dcv'], ['0103', 'Muster-LIS'], ['0132', '47.23.001']]),
        ...ts('8218', 'Timestamp_Erstellung_Datensatz', '20151008', '173510')]),
    ...obj('8136', 'Laborkennung', 'Obj_0036', [...obj('8239', 'Laborbezeichnung', 'Obj_0043', [['1250', 'Laborarztpraxis Musterarzt']]), ['7266', '2']]),
    ...obj('8119', 'Betriebsstaette', 'Obj_0019', [['0204', '2'], ['0204', '5'], ['0203', 'Laborpraxis Musterhausen'], ['0201', '123456789'],
        ...obj('8143', 'Organisation', 'Obj_0043', [['1250', 'Laborpraxis Musterhausen'],
            ...obj('8229', 'Anschrift_Arbeitsstelle', 'Obj_0007', [['3107', 'Musterstraße'], ['3109', '123'], ['3112', '12345'], ['3113', 'Musterhausen']])])]),
    ['8001', '8220'],
    ['8000', '8205'],
    ...obj('8122', 'Einsenderidentifikation', 'Obj_0022', [['7321', '01'], ...obj('8114', 'Arztidentifikation', 'Obj_0014', [['0212', '123456601']])]),
    ...obj('8145', 'Patient', 'Obj_0045', obj('8147', 'Person', 'Obj_0047', [
        ['7420', '12'], ['3101', 'Mustermann'], ['3102', 'Erika'], ['3103', '19640812'], ['3110', 'W']])),
    ...obj('8117', 'Befundinformationen', 'Obj_0017', [['8401', '2'], ['7305', 'B-2026-0001']]),
    ...obj('8137', 'Material', 'Obj_0037', [['8428', 'SE'], ['8430', 'Serum'], ...ts('8219', 'Timestamp_Materialabnahme_entnahme', '20261118', '081500')]),
    ...obj('8135', 'Laborergebnisbericht', 'Obj_0035', [
        ...obj('8160', 'UE_Klinische_Chemie', 'Obj_0060', [
            ['7364', 'R123'], ['8410', 'NA'], ['8411', 'Natrium'], ['8418', '06'], ['7306', '01'],
            ['8420', '141'], ['8419', '1'], ['8421', 'mmol/l'], ['8422', 'N'],
            ...obj('8142', 'Normalwert', 'Obj_0042', [['8461', '135'], ['8462', '145']])])]),
    ...obj('8110', 'Anhang', 'Obj_0010', [
        ...obj('8242', 'base64-kodierte_Anlage', 'Obj_0068',
            (Buffer.from('Befund Natrium 141 mmol/l\r\nReferenzbereich 135-145 mmol/l\r\nGezeichnet: Dr. Muster\r\n', 'latin1')
                .toString('base64').match(/.{1,60}/g)).map(c => ['6329', c])),
        ['6303', 'TXT']]),
    ['8001', '8205'],
    ['8000', '8221'],
    ['9300', '0'.repeat(40)],
    ['8001', '8221'],
]);

/* ---------- KVDT – Container + minimales ADT-Datenpaket ---------- */
write('Z01123456700_19.11.2026_10.00.con', [
    ['8000', 'con0'], ['9103', '20261119'], ['9106', '4'], ['9132', '1'],
    ['8000', 'besa'], ['0201', '021234500'], ['0203', 'Praxis Dr. Muster'], ['0212', '123456601'], ['0211', 'Muster'],
    ['0205', 'Musterweg 1'], ['0215', '20095'], ['0216', 'Hamburg'], ['0208', '040/123456'],
    ['8000', 'rvsa'], ['0201', '021234500'], ['0300', '0'],
    ['8000', 'adt0'], ['0105', 'X/36/2610/12/id9'], ['9102', '02'], ['9212', 'ADT0127.01'], ['0102', 'Muster PVS GmbH'],
    ['0121', 'Ottostr. 1'], ['0122', '56070'], ['0123', 'Koblenz'], ['0124', '0261/4094'], ['0126', 'Fa. Datasoft'],
    ['0127', 'Dürener Str. 322'], ['0128', '50859'], ['0129', 'Köln'], ['0130', '0221/10002'], ['0103', 'DOCSFUN'], ['9204', '42026'],
    ['8000', '0101'], ['3000', '2002'], ['3101', 'Schmitz'], ['3102', 'Erna'], ['3103', '19661024'], ['3119', 'A123456780'],
    ['3112', '50859'], ['3108', '1'], ['3110', 'W'], ['4101', '42026'], ['4104', '27106'], ['4106', '00'], ['4111', '101568008'],
    ['4131', '00'], ['4132', '00'], ['4121', '0'], ['4122', '00'], ['4239', '00'],
    ['5000', '20261119'], ['5001', '03000'], ['5098', '021234500'], ['5099', '123456601'],
    ['6001', 'L50.0'], ['6003', 'G'],
    ['8000', 'adt9'],
    ['8000', 'con9'],
]);
console.log('samples written');
