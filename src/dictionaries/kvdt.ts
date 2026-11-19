/**
 * KVDT – Container-Sätze und ADT-Datenpaket
 * Quelle: KBV, Datensatzbeschreibung KVDT Version 6.09 (13.11.2026, gültig ab Abrechnung Q1/2027)
 * Kapitel 2.3.1 (Container-Feldtabelle) und 3.5.1 (ADT-Feldtabelle).
 *
 * Nicht enthalten: KADT-, SADT- und HDRG-spezifische Felder (Kapitel 4.7.1, 5.5.1, 6.5.4).
 * Viele davon sind mit ADT identisch; fehlende FK können über xdt.customFieldIdentifiers ergänzt werden.
 */
import { CheckKind } from '../core/types';
import { BOOL01, SEX, DIAG_SAFETY, SIDE, table, withValues } from './table';

const CHECKS: Record<string, CheckKind> = {
    '005': 'hhmm', '016': 'quarter', '021': 'birthdate', '022': 'icd', '049': 'bsnr',
    '050': 'lanr', '054': 'kvnr', '056': 'lanr', '058': 'dateRange', '060': 'timestamp14',
};

const FIELDS = `
# --- Container
0201|Betriebs- (BSNR) oder Nebenbetriebsstättennummer (NBSNR)|9|n|049,061,062,750,819,857,875,878
0203|(N)BSNR-/Krankenhaus-Bezeichnung|<=60|a|
0205|Straße der (N)BSNR-/Krankenhaus-Adresse|<=60|a|
0208|Telefonnummer|<=60|a|
0209|Telefaxnummer|<=60|a|
0211|Arztname oder Erläuterung|<=60|a|
0212|Lebenslange Arztnummer (LANR)|9|n|050,762,836,875
0213|Krankenhaus-IK (im Rahmen der ASV-Abrechnung)|9|n|857
0214|KV-Bereich|2|n|532
0215|PLZ der (N)BSNR-/Krankenhaus-Adresse|<=7|a|
0216|Ort der (N)BSNR-/Krankenhaus-Adresse|<=60|a|
0218|E-Mail der Betriebsstätte/Praxis/Krankenhaus|<=60|a|
0219|Titel des Arztes|<=100|a|
0220|Arztvorname|<=45|a|
0221|Namenszusatz des Arztes|<=20|a|
0222|ASV-Teamnummer|9|n|059
0223|Pseudo-LANR für Krankenhausärzte (ASV)|9|n|063,836
0224|Produkttypversion des Konnektors|<=20|a|
0225|TI-Fachanwendung / TI-Komponente|1-2|n|177,858,862
0226|Systemunterstützung / Ausstattung der Praxis|1|n|147
0227|Ablaufdatum des Konnektorzertifikats|8|d|872
0228|Produktname des Konnektors|<=60|a|874
0300|Abrechnung von (zertifikatspflichtigen) Laborleistungen|1|n|147,740
0301|pnSD/uu-Analysen|1|n|107,740,741
0302|Gerätetyp|<=60|a|741,748
0303|Hersteller|<=60|a|
0304|Analyt-ID|3|n|211,740
0305|RV-Zertifikat|1|n|107,748
9103|Erstellungsdatum|8|d|
9106|verwendeter Zeichensatz|1|n|182
9132|enthaltene Datenpakete dieser Datei|1|n|124,743
# --- ADT
0102|Softwareverantwortlicher (SV)|<=60|a|
0103|Software|<=60|a|
0105|KBV-Prüfnummer|15-17|a|052,204,213
0111|E-Mail-Adresse des SV|<=60|a|
0121|Straße des SV|<=60|a|
0122|PLZ des SV|<=7|a|
0123|Ort des SV|<=60|a|
0124|Telefonnummer des SV|<=60|a|
0125|Telefaxnummer des SV|<=60|a|
0126|Regionaler Systembetreuer (SB)|<=60|a|
0127|Straße des SB|<=60|a|
0128|PLZ des SB|<=7|a|
0129|Ort des SB|<=60|a|
0130|Telefonnummer des SB|<=60|a|
0131|Telefaxnummer des SB|<=60|a|
0132|Release-Stand der Software|<=60|a|840
3000|Patientennummer|<=20|a|
3003|Schein-ID|<=60|a|
3006|CDM Version|5-11|a|055,307,308,790
3010|Datum und Uhrzeit der Onlineprüfung und -aktualisierung (Timestamp)|14|n|060,864,869,876
3011|Ergebnis der Onlineprüfung und -aktualisierung|1|n|528
3012|Error-Code|<=5|n|309,310
3013|Prüfziffer des Fachdienstes|<=128|a|
3100|Namenszusatz|<=20|a|
3101|Name|<=45|a|
3102|Vorname|<=45|a|
3103|Geburtsdatum|8|n|021,304,313
3104|Titel|<=20|a|
3105|Versichertennummer|6-12|n|053,776
3107|Straße|<=46|a|
3108|Versichertenart|1|n|116
3109|Hausnummer|<=9|a|
3110|Geschlecht|1|a|533
3112|PLZ|<=10|a|478,479
3113|Ort|<=40|a|
3114|Wohnsitzlaendercode|<=3|a|784
3115|Anschriftenzusatz|<=40|a|
3116|WOP|2|n|531,774
3119|Versicherten_ID|10|a|054,776,537
3120|Vorsatzwort|<=20|a|
3121|PostfachPLZ|<=10|a|479,783
3122|PostfachOrt|<=40|a|
3123|Postfach|<=8|a|
3124|PostfachWohnsitzlaendercode|<=3|a|784
3673|Dauerdiagnose (ICD-Code)|3,5,6|a|022,486,489,490,491,492
3674|Diagnosensicherheit Dauerdiagnose|1|a|109,860
3675|Seitenlokalisation Dauerdiagnose|1|a|110
3676|Diagnosenerläuterung Dauerdiagnose|<=60|a|
3677|Diagnosenausnahmetatbestand Dauerdiagnosen|<=60|a|491
4101|Quartal|5|n|016,324,480,706
4102|Ausstellungsdatum|8|d|405,406
4103|Vermittlungs-/Kontaktart|1|n|108,870,877
4104|Abrechnungs-VKNR|5|n|017,201,212,763,790
4105|Ergänzende Informationen zur Vermittlungs-/Kontaktart|<=60|a|
4106|Kostenträger-Abrechnungsbereich (KTAB)|2|n|174,778,779,780,818,827
4108|Zulassungsnummer (mobiles Lesegerät)|<=40|a|
4109|Letzter Einlesetag der Versichertenkarte im Quartal|8|d|480,776,790,876
4110|VersicherungsschutzEnde|8|d|315
4111|Kostentraegerkennung|9|n|202
4112|eEB vorhanden|1|n|142,895
4114|Vermittlungscode|14|a|
4115|Tag der Terminvermittlung|8|d|877,886,887
4121|Gebührenordnung|1|n|113,210
4122|Abrechnungsgebiet|2|n|131
4123|Personenkreis / Untersuchungskategorie|2|n|149
4124|SKT-Zusatzangaben|<=60|a|734
4125|Gültigkeitszeitraum von ... bis ...|16|n|058,363
4126|SKT-Bemerkungen|<=60|a|
4131|BesonderePersonengruppe|2|a|534,778,779,780,818,827
4132|DMP_Kennzeichnung|2|a|536
4133|VersicherungsschutzBeginn|8|d|775
4134|Kostentraegername|<=45|a|777
4202|Unfall, Unfallfolgen|1|n|142
4204|eingeschränkter Leistungsanspruch gemäß §16 Abs. 3a SGB V|1|n|142
4205|Auftrag|<=60|a|744,746,755
4206|Mutmaßlicher Tag der Entbindung|8|d|
4207|Diagnose/Verdachtsdiagnose|<=60|a|746
4208|Befund/Medikation|<=60|a|746
4209|Zusätzliche Angaben zu Untersuchungen|<=60|a|756
4214|Behandlungstag bei IVD-Leistungen|8|d|899,900,901
4217|(N)BSNR des Erstveranlassers|9|n|049,319,431,820
4218|(N)BSNR des Überweisers|9|n|049,319,328,720,746,821,822
4219|Überweisung von anderen Ärzten|<=60|a|328
4220|Überweisung an|<=60|a|320
4221|Kurativ / Präventiv / ESS / bei belegärztlicher Behandlung|1|n|205,404,754
4225|ASV-Teamnummer des Erstveranlassers|9|n|059,431
4226|ASV-Teamnummer des Überweisers|9|n|059,328,838
4229|Ausnahmeindikation|5|n|432
4233|Stationäre Behandlung von ... bis ...|16|n|058,354
4234|anerkannte Psychotherapie|1|n|142
4235|Datum des Anerkennungsbescheides|8|d|
4236|Abklärung somatischer Ursachen vor Aufnahme einer Psychotherapie|1|n|142
4239|Scheinuntergruppe|2|n|331,354,356,426,427,754,755
4241|LANR des Erstveranlassers|9|n|056,762,844
4242|LANR des Überweisers|9|n|056,721,762,845
4243|Weiterbehandelnder Arzt|<=60|a|
4247|Antragsdatum (des Anerkennungsbescheides)|8|d|
4248|Pseudo-LANR (ASV) des Erstveranlassers|9|n|064,844
4249|Pseudo-LANR (ASV) des Überweisers|9|n|064,845
4250|Kombinationsbehandlung aus Einzel- und Gruppentherapie|1|n|142
4251|Durchführungsart der Kombinationsbehandlung|1|n|176
4252|Gesamtanzahl bewilligter Therapieeinheiten für den Versicherten|<=3|n|850,852,897
4253|Bewilligte GOP für den Versicherten|5,6|a|042,850,853,897
4254|Anzahl der abgerechneten GOPen für den Versicherten|<=3|n|
4255|Gesamtanzahl bewilligter Therapieeinheiten für die Bezugsperson|<=3|n|851,852
4256|Bewilligte GOP für die Bezugsperson|5,6|a|042,851,853
4257|Anzahl der abgerechneten GOPen für die Bezugsperson|<=3|n|
4299|LANR des Vertragspsychotherapeuten|9|n|050,762
5000|Leistungstag|8|d|304,315,324,363,899,900
5001|Gebührennummer (GNR)|<=9|a|203,496,497,701,702,703,704
5002|Art der Untersuchung|<=60|a|
5003|(N)BSNR des vermittelten Facharztes|9|n|049
5005|Multiplikator|3|n|535,894
5006|Um-Uhrzeit|4|n|005
5008|DKM|<=3|n|
5009|freier Begründungstext|<=60|a|
5010|Chargennummer|<=60|a|868
5011|Sachkosten-Bezeichnung|<=60|a|
5012|Sachkosten / Materialkosten in Cent|<=10|n|710
5013|Prozent der Leistung|3|n|167
5015|Organ|<=60|a|
5016|Name des Arztes|<=60|a|
5017|Besuchsort bei Hausbesuchen|<=60|a|
5018|Zone bei Besuchen|2|a|111
5019|Erbringungsort / Standort des Gerätes|<=60|a|
5020|Wiederholungsuntersuchung|1|n|147
5021|Jahr der letzten Krebsfrüherkennungsuntersuchung|4|n|027
5023|GO-Nummern-Zusatz|1|a|
5024|GNR-Zusatzkennzeichen für poststationär erbrachte Leistungen|1|a|521
5025|Aufnahmedatum|8|d|
5026|Entlassungsdatum|8|d|
5034|OP-Datum|8|d|701
5035|OP-Schlüssel|<=8|a|223,702,703,705
5036|GNR als Begründung|5,6|a|042,702,704
5037|Gesamt-Schnitt-Naht-Zeit (Minuten)|<=3|n|
5038|Komplikation|<=60|a|
5040|Patientennummer der eDokumentation Hautkrebs-Screening|<=8|a|
5041|Seitenlokalisation OPS|1|a|110,178,705,706
5042|Mengenangabe Kontrast-/Arzneimittel|<=5|n|707
5043|Maßeinheit Kontrast-/Arzneimittel|1|n|106
5050|Melde-ID Implantateregister|10|a|888,894
5051|Hash-String Implantateregister|<=512|a|889
5052|Hash-Wert Implantateregister|64|a|890
5074|Name Hersteller / Lieferant|<=60|a|
5075|Artikel-/Modellnummer|<=60|a|
5076|Rechnungsnummer|<=20|a|
5077|HGNC-Gensymbol|<=20|a|222,770,816
5078|Gen-Name|<=60|a|816,891,893
5079|Art der Erkrankung|<=60|a|770,816
5098|(N)BSNR des Ortes der Leistungserbringung|9|n|049,061,062,716,720,724,823,859,869
5099|LANR des Vertragsarztes/Vertragspsychotherapeuten|9|n|050,056,715,721,723,725,762,837
5100|ASV-Teamnummer des Vertragsarztes|9|n|059,789,838
5101|Pseudo-LANR (ASV) des LE|9|n|063,837,839
5102|Krankenhaus-IK (im Rahmen der ASV-Abrechnung)|9|n|859
6001|ICD-Code|3,5,6|a|022,486,489,490,491,492
6003|Diagnosensicherheit|1|a|109,856
6004|Seitenlokalisation|1|a|110
6006|Diagnosenerläuterung|<=60|a|
6008|Diagnosenausnahmetatbestand|<=60|a|491
8000|Satzart|4,5|a|175,209
9102|Empfänger (KV)|2|n|532
9115|Erstellungsdatum ADT-Datenpaket|8|d|
9204|Abrechnungsquartal|5|n|016
9212|Version der Satzbeschreibung|<=11|a|031,813
9250|AVWG-Prüfnummer der AVS|15-17|a|052,204
9251|HMV-Prüfnummer|15-17|a|052,204
9260|Anzahl Teilabrechnungen|2|n|129
9261|Abrechnungsteil x von y|2|n|132,738
9901|Systeminterner Parameter|<=60|a|
`;

export const kvdtRecordTypes: Record<string, string> = {
    con0: 'Container-Header', con9: 'Container-Abschluss', besa: 'Betriebsstättendaten', rvsa: 'Ringversuchszertifikate',
    adt0: 'ADT-Datenpaket-Header', adt9: 'ADT-Datenpaket-Abschluss',
    '0101': 'Ambulante Behandlung', '0102': 'Überweisung', '0103': 'Belegärztliche Behandlung',
    '0104': 'Notfalldienst/Vertretung/Notfall',
    kad0: 'KADT-Datenpaket-Header', kad9: 'KADT-Datenpaket-Abschluss', '0109': 'Kurärztliche Behandlung',
    sad0: 'SADT-Datenpaket-Header', sad9: 'SADT-Datenpaket-Abschluss',
    sad1: 'SADT-Ambulante Behandlung', sad2: 'SADT-Überweisung', sad3: 'SADT-Belegärztliche Behandlung',
    hdrg0: 'HDRG-Datenpaket-Header', hdrg9: 'HDRG-Datenpaket-Abschluss', hdrg1: 'HDRG',
};

const KV: Record<string, string> = {
    '01': 'Schleswig-Holstein', '02': 'Hamburg', '03': 'Bremen', '17': 'Niedersachsen', '18': 'Dortmund',
    '19': 'Münster', '20': 'Dortmund / Westfalen-Lippe', '21': 'Aachen', '24': 'Düsseldorf', '25': 'Duisburg',
    '27': 'Köln', '28': 'Linker Niederrhein', '31': 'Ruhr', '37': 'Bergisch-Land', '39': 'Darmstadt',
    '40': 'Frankfurt/Main', '41': 'Gießen', '42': 'Kassel', '43': 'Limburg', '44': 'Marburg', '45': 'Wiesbaden',
    '47': 'Koblenz', '48': 'Rheinhessen', '49': 'Pfalz', '50': 'Trier', '51': 'Rheinland-Pfalz', '55': 'Karlsruhe',
    '60': 'Freiburg', '61': 'Stuttgart', '62': 'Reutlingen', '63': 'München Stadt u. Land', '64': 'Oberbayern',
    '65': 'Oberfranken', '66': 'Mittelfranken', '67': 'Unterfranken', '68': 'Oberpfalz', '69': 'Niederbayern',
    '70': 'Schwaben', '72': 'Berlin', '73': 'Saarland', '78': 'Mecklenburg-Vorpommern', '79': 'Potsdam',
    '80': 'Cottbus', '81': 'Frankfurt/Oder', '83': 'Brandenburg', '85': 'Magdeburg', '86': 'Halle', '87': 'Dessau',
    '93': 'Thüringen', '94': 'Chemnitz', '95': 'Dresden', '96': 'Leipzig', '99': 'Knappschaft',
};

export const kvdtFields = withValues(table(FIELDS, CHECKS), {
    '8000': [kvdtRecordTypes, true],
    '0214': [KV, true],
    '9102': [KV, true],
    '9106': [{ '4': 'ISO 8859-15' }, true],
    '9132': [{ '1': 'ADT-Datenpaket', '3': 'KADT (kurärztlich)', '6': 'SADT-Datenpaket', '7': 'Hybrid-DRG-Datenpaket' }, true],
    '0225': [{
        '1': 'eRezept', '3': 'NFDM', '4': 'eMP', '5': 'KIM', '6': 'eAU', '7': 'eArztbrief', '8': 'Kartenterminal',
        '9': 'SMC-B', '10': 'eHBA', '11': 'ePA Stufe 3 (ePA4all)', '12': 'eVDGA', '13': 'TIM',
    }, true],
    '0226': [BOOL01, true], '0300': [BOOL01, true], '5020': [BOOL01, true],
    '0301': [{ '0': 'nein', '1': 'ja – ausschließlich', '2': 'ja – teilweise' }, true],
    '0305': [{ '0': 'nein', '1': 'ja', '2': 'pnSD/uu-Analyse' }, true],
    '3011': [{
        '1': 'Aktualisierung VSD auf eGK durchgeführt', '2': 'Keine Aktualisierung VSD auf eGK erforderlich',
        '3': 'Aktualisierung VSD auf eGK technisch nicht möglich', '4': 'Authentifizierungszertifikat eGK ungültig',
        '5': 'Onlineprüfung des Authentifizierungszertifikats technisch nicht möglich',
        '6': 'Aktualisierung technisch nicht möglich und maximaler Offline-Zeitraum überschritten',
    }, true],
    '3108': [{ '1': 'Mitglied', '3': 'Familienversicherter', '5': 'Rentner' }, true],
    '3110': [SEX, true],
    '3116': [{
        '00': 'Dummy bei eGK', '01': 'Schleswig-Holstein', '02': 'Hamburg', '03': 'Bremen', '17': 'Niedersachsen',
        '20': 'Westfalen-Lippe', '38': 'Nordrhein', '46': 'Hessen', '47': 'Koblenz (fusioniert)',
        '48': 'Rheinhessen (fusioniert)', '49': 'Pfalz (fusioniert)', '50': 'Trier (fusioniert)', '51': 'Rheinland-Pfalz',
        '52': 'Baden-Württemberg', '55': 'Nordbaden (fusioniert)', '60': 'Südbaden (fusioniert)',
        '61': 'Nordwürttemberg (fusioniert)', '62': 'Südwürttemberg (fusioniert)', '71': 'Bayern', '72': 'Berlin',
        '73': 'Saarland', '78': 'Mecklenburg-Vorpommern', '83': 'Brandenburg', '88': 'Sachsen-Anhalt',
        '93': 'Thüringen', '98': 'Sachsen',
    }, true],
    '3674': [DIAG_SAFETY, true], '6003': [DIAG_SAFETY, true],
    '3675': [SIDE, true], '6004': [SIDE, true],
    '4103': [{ '1': 'TSS-Terminfall', '2': 'TSS-Akutfall', '3': 'HA-Vermittlungsfall', '4': 'Offene Sprechstunde', '6': 'TSS-Routine-Termin' }, true],
    '4106': [{
        '00': 'Primärabrechnung', '01': 'Sozialversicherungsabkommen (SVA)', '02': 'Bundesversorgungsgesetz (BVG)',
        '03': 'Bundesentschädigungsgesetz (BEG)', '04': 'Grenzgänger (GG)', '05': 'Rheinschiffer (RHS)',
        '06': 'Sozialhilfeträger, ohne Asylstellen (SHT)', '07': 'Bundesvertriebenengesetz (BVFG)',
        '08': 'Asylstellen (AS)', '09': 'Schwangerschaftsabbrüche',
    }, true],
    '4112': [{ '1': 'ja' }, true], '4202': [{ '1': 'ja' }, true], '4204': [{ '1': 'ja' }, true],
    '4234': [{ '1': 'ja' }, true], '4236': [{ '1': 'ja' }, true], '4250': [{ '1': 'ja' }, true],
    '4121': [{ '0': 'EBM', '1': 'BMÄ', '2': 'E-GO', '3': 'GOÄ' }, true],
    '4122': [{
        '00': 'kein besonderes Abrechnungsgebiet', '01': 'Dialyse-Arztkosten', '02': 'Dialyse-Sachkosten',
        '03': 'Methadon-Substitutionsbehandlung', '04': 'persönl. erbrachte Notfallleistungen ermächtigter KH-Ärzte',
        '05': 'sonstige Notfallleistungen ermächtigter KH-Ärzte', '06': 'Fremde Zytologie', '07': 'Diabetesabrechnung',
        '08': 'Umweltmedizin', '09': 'Rheuma', '10': 'Hirnleistungsstörungen', '14': 'Ambulantes Operieren',
        '15': 'AOP nach §115b',
    }, true],
    '4123': [{
        '01': 'Beschädigter', '02': 'Schwerbeschädigter', '03': 'Angehöriger', '04': 'Hinterbliebener',
        '05': 'Pflegeperson', '06': 'Tauglichkeitsuntersuchung', '07': 'ärztl. Versorgung', '08': 'Bewerber',
        '09': 'Erstuntersuchung', '10': 'Nachuntersuchung', '11': 'Ergänzungsuntersuchung', '12': 'Verfolgte',
    }, true],
    '4131': [{
        '00': 'keine Besondere Personengruppe', '04': 'BSHG § 264 SGB V', '06': 'SER (Soziales Entschädigungsrecht)',
        '07': 'SVA, Abrechnung nach Aufwand', '08': 'SVA, pauschal', '09': 'Empfänger von Leistungen nach §§ 4, 6 AsylbLG',
    }, true],
    '4132': [{
        '00': 'kein DMP-Kennzeichen', '01': 'Diabetes mellitus Typ 2', '02': 'Brustkrebs', '03': 'Koronare Herzkrankheit',
        '04': 'Diabetes mellitus Typ 1', '05': 'Asthma bronchiale', '06': 'COPD', '07': 'Chronische Herzinsuffizienz',
        '08': 'Depression', '09': 'Rückenschmerz', '10': 'Rheuma', '11': 'Osteoporose', '12': 'Adipositas Erwachsene',
        '13': 'Adipositas Kinder und Jugendliche',
    }, false],
    '4221': [{ '1': 'kurativ', '2': 'präventiv', '3': 'Empfängnisregelung, Sterilisation, Schwangerschaftsabbruch', '4': 'belegärztliche Behandlung' }, true],
    '4239': [{
        '00': 'Ambulante Behandlung', '20': 'Selbstausstellung', '21': 'Auftragsleistungen', '23': 'Konsiliaruntersuchung',
        '24': 'Mit-/Weiterbehandlung', '26': 'Stationäre Mitbehandlung, Vergütung nach ambulanten Grundsätzen',
        '27': 'Überweisungsschein Labor als Auftragsleistung (Muster 10/10C)', '28': 'Anforderungsschein Laborgemeinschaft (Muster 10a)',
        '30': 'Belegärztliche Behandlung', '31': 'Belegärztliche Mitbehandlung', '32': 'Vertretung bei belegärztl. Behandlung',
        '41': 'Ärztlicher Notfalldienst', '42': 'Urlaubs-/Krankheitsvertretung', '43': 'Notfall', '44': 'Notfalldienst mit Taxi',
        '45': 'Notarzt-/Rettungswagen', '46': 'Zentraler Notfalldienst',
    }, true],
    '4251': [{
        '1': 'Alleinige Durchführung, überwiegend Einzeltherapie', '2': 'Alleinige Durchführung, überwiegend Gruppentherapie',
        '3': 'Einzeltherapie-Anteil (zwei Psychotherapeuten)', '4': 'Gruppentherapie-Anteil (zwei Psychotherapeuten)',
    }, true],
    '5018': [{ Z1: 'Zone 1', Z2: 'Zone 2', Z3: 'Zone 3', Z4: 'Zone 4' }, true],
    '5024': [{ N: 'poststationäre Leistung' }, true],
    '5041': [SIDE, true],
    '5043': [{ '1': 'ml', '2': 'mg', '3': 'µg' }, true],
});

export const kvdtRules: Record<string, string> = {
    '005': 'HHMM (0000–2359)',
    '016': 'Quartal QJJJJ',
    '017': 'VKNR nnmmm (nn = KV-Kennung)',
    '021': 'Geburtsdatum JJJJMMTT, zusätzlich JJJJMM00, JJJJ0000, 00000000',
    '022': 'ICD-Code: ann, ann.n, ann.nn, ann.n-',
    '031': 'Version [a]aaaMMJJ.nn',
    '049': '(N)BSNR kknnnnnmm, kk gemäß Regel 162',
    '050': 'LANR nnnnnnmff mit Prüfziffer (Fehler)',
    '052': 'Prüfnummer a/n[n][n]/JJMM/nn/aaa',
    '053': 'Versichertennummer: 6–12 Ziffern',
    '054': 'Versicherten-ID annnnnnnnP mit Prüfziffer',
    '056': 'LANR nnnnnnmff mit Prüfziffer (Warnung)',
    '058': 'Zeitraum JJJJMMTTJJJJMMTT',
    '059': 'ASV-Teamnummer 00nnnnnnP',
    '060': 'Zeitstempel JJJJMMTThhmmss',
    '061': 'BSNR Terminservicestelle-KH 35kknnnnn',
    '062': 'BSNR SAPV 74kknnn63',
    '063': 'Pseudo-LANR ASV 555555nff (Fehler)',
    '064': 'Pseudo-LANR ASV 555555nff (Warnung)',
    '175': 'adt0, adt9, 0101, 0102, 0103, 0104',
    '209': 'con0, besa, con9, rvsa',
    '486': 'Mindestens eines der Felder 6001 oder 3673 muss vorhanden sein',
    '533': 'M, W, U, X, D',
};
