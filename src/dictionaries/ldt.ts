/**
 * LDT 3 – Feldtabelle, Satzarten, Objektkatalog
 * Quelle: KBV, EXT_ITA_VGEX_LDT 3.2.20 Gesamtdokument (13.05.2026, in Kraft ab 01.10.2026)
 * Kapitel 6.2, 9 (Feldtabelle), 10.1 (Formatregeln), 11 (Objektkatalog).
 */
import { CheckKind } from '../core/types';
import { BOOL01, SEX, DIAG_SAFETY, table, withValues } from './table';

const CHECKS: Record<string, CheckKind> = {
    F002: 'date', F003: 'birthdate', F004: 'icd', F007: 'ldtVersion', F010: 'bsnr',
    F011: 'lanr', F013: 'kvnr', F016: 'time', F018: 'dateLoose',
};

const FIELDS = `
0001|Version der Datensatzbeschreibung|<=12|alnum|F007,E001
0080|ID der Fallakte oder Studie|<=60|alnum|
0081|Bezeichnung der Fallakte oder Studie|<=60|alnum|
0103|Software / Name der Software|<=60|alnum|
0105|KBV-Prüfnummer|16|alnum|F012,K050
0132|Version / Releasestand der Software|<=60|alnum|
0200|Betriebsstätten-ID|<=60|alnum|K044
0201|Betriebs- (BSNR) oder Nebenbetriebsstättennummer (NBSNR)|9|num|F010,F021,K020,K044
0203|(N)BSNR-Bezeichnung|<=60|alnum|
0204|Status der Betriebsstätte|1|num|E046,K043
0212|Lebenslange Arztnummer (LANR)|9|num|F011,K020,K115,K116
0213|Institutionskennzeichen (IK) der Betriebsstätte|9|num|
0222|ASV-Teamnummer|9|num|F014,K057,K116
0223|Pseudo-LANR für Krankenhausärzte (ASV)|9|num|F022,K020,K115,K116
0306|Vertrags-ID des behandelnden Arztes|<=60|alnum|
0307|Arzt-ID eines Arztes|<=60|alnum|
0308|Typ der Arzt-ID|1|num|E047
0600|Name der Einrichtung des Auftraggebers|<=60|alnum|K029
1202|Adresstyp|1|num|E042
1250|Organisation / Firma|<=60|alnum|
1251|Rechtsform der Organisation|<=60|alnum|
1252|Funktionsbezeichnung oder Titel der Person innerhalb der Organisation|<=60|alnum|
3000|Patientennummer|<=60|alnum|
3100|Namenszusatz|<=20|alnum|
3101|Nachname|<=45|alnum|
3102|Vorname|<=45|alnum|
3103|Geburtsdatum|8|num|F003,K094
3104|Titel|<=20|alnum|
3105|Versichertennummer|6-12|num|K025,K090
3107|Straße|<=46|alnum|
3108|Versichertenart|1|num|E002,K056
3109|Hausnummer|<=9|alnum|
3110|Geschlecht|1|alnum|E019,K094
3112|Postleitzahl (PLZ)|<=10|alnum|K017
3113|Ort|<=40|alnum|
3114|Wohnsitzländercode|<=3|alnum|K017
3115|Anschriftenzusatz|<=40|alnum|
3116|WOP|2|num|E022,K088
3119|Versicherten_ID|10|alnum|F013,K025,K091
3120|Vorsatzwort|<=20|alnum|
3121|PostfachPLZ|<=10|alnum|K017
3122|PostfachOrt|<=40|alnum|
3123|Postfach|<=8|alnum|
3124|PostfachWohnsitzländercode|<=3|alnum|K017
3130|Einschreibestatus Selektivverträge|1|num|E041
3131|Teilnahme von|8|date|F002
3132|Teilnahme bis|8|date|F002
3133|Datum der Antragstellung|8|date|F002
3134|Bezeichnung des Selektivvertrages|<=60|alnum|
3313|HPV-Impfung|1|num|E168
3314|HPV-HR-Test|1|num|E040,K128
3316|HPV-HR-Testergebnis|1|num|E169,K122,K128
3317|HPV-Typ 16/18|1|num|K122,E179
3318|HPV-Test|1|num|E040,K123,K124
3319|Ko-Test|1|num|E040,K123,K124
3320|Zeitraum sofort|1|num|E011,K123,K124
3321|Zeitraum in Monaten|1-5|alnum|F023,K123,K124
3322|Alterskategorie|1|num|E167
3412|Blutgruppe-Eurocode|6|alnum|K071,K078
3413|Antikörpersuchtest (gegen Erythrozytenantigene)|1|num|E054,K071,K078
3414|Spezifität weitere Erythrozytenantigene|<=60|alnum|K071,K078
3415|Spezifität Erythrozytenantikörper|<=60|alnum|K071,K078
3416|Spezifität HLA-, HPA-, HNA-Antigene|<=60|alnum|K071,K078
3417|Spezifität HLA-, HPA-, HNA-Antikörper|<=60|alnum|K071,K078
3418|Direkter Coombstest (DCT)|1|num|E055,K071,K078
3419|Ergebnis Kreuzprobe|<=60|alnum|K071,K078
3420|Anforderung NHP (Nothilfepass)|1|num|E056
3424|Therapiebeginn|8|date|F002
3425|Therapieende|8|date|F002
3471|Entbindungstermin (errechnet)|8|date|F002
3473|Untersuchungsergebnis durch Auftragslaboratorium erstellt|1|num|E011
3564|Text|<=990|alnum|E036,K100
3622|Größe des Patienten (cm)||f|
3623|Gewicht des Patienten (kg)||f|
3628|Muttersprache|<=60|alnum|
3664|Anzahl Geburten|2|num|
3666|Anzahl Kinder|2|num|
3668|Anzahl Schwangerschaften|2|num|
3689|Status der Medikation|1|num|E156
4104|Abrechnungs-VKNR|5|num|F001,K090,K091
4106|Kostenträger-Abrechnungsbereich (KTAB)|2|num|E015,K022,K023,K024
4108|Zulassungsnummer (mobiles Kartenlesegerät)|<=60|alnum|
4109|Letzter Einlesetag der Versichertenkarte im Quartal|8|date|F002,K017,K025,K087,K090,K091
4110|VersicherungsschutzEnde|8|date|F002,K087,K090,K088
4111|Kostenträger-Kennung (IK)|9|num|
4121|Gebührenordnung|1|num|E008,K005,K008,K019
4122|Abrechnungsgebiet|2|num|E010
4124|SKT-Zusatzangaben|<=60|alnum|
4126|SKT-Zusatzbemerkung|<=60|alnum|
4131|Besondere Personengruppen|2|num|E021,K022,K023,K024
4132|DMP_Kennzeichnung|2|num|E020
4133|VersicherungsschutzBeginn|8|date|F002,K091
4134|Kostenträgername|<=45|alnum|
4202|Unfall, Unfallfolgen|1|num|E011
4204|Eingeschränkter Leistungsanspruch gemäß §16 Abs. 3a SGB V|1|num|E011
4207|Diagnose / Verdachtsdiagnose|<=60|alnum|
4208|Befund / Medikation|<=60|alnum|
4209|Zusätzliche Angaben zu Untersuchungen|<=60|alnum|K133
4210|SER|1|num|E011
4217|(N)BSNR des Erstveranlassers|9|num|F010,K014,K041
4221|Kurativ / Präventiv / ESS / bei belegärztl. Behandlung|1|num|E039,K012,K021,K031,K032
4225|ASV-Teamnummer des Erstveranlassers|9|num|K014,K041
4229|Knappschaftskennziffer|5|num|K015
4231|Kontrolluntersuchung einer bekannten Infektion|1|num|E011
4239|Scheinuntergruppe|2|num|E009,K012,K014,K015,K016,K021,K031,K032,K041,K050,K116
4241|LANR des Erstveranlassers|9|num|F011,K014,K041
4248|Pseudo-LANR (ASV) des Erstveranlassers|9|num|F022,K014
5001|Gebührennummer (GNR)|<=9|alnum|F009,K019
5005|Multiplikator|3|num|E003
5009|freier Begründungstext|<=60|alnum|
6001|ICD-Code|3,5,6|alnum|F004
6003|Diagnosesicherheit|1|alnum|E037
6004|Lokalisation|1|alnum|E038
6006|Diagnoseerläuterung|<=60|alnum|
6008|Diagnoseausnahmetatbestand|<=60|alnum|
6206|Pharmazentralnummer (PZN)|8|num|F020
6207|Rezeptur|<=990|alnum|
6208|Handelsname des Arzneimittels|<=60|alnum|
6212|Arzneimittelwirkstoff / Wirkstoff|<=60|alnum|
6214|Wirkstoff-Klassifikation (Code-System)|<=60|alnum|
6221|Kennzeichnung Fremdbefund|1|num|E011
6224|Wirkstoff-Code|<=60|alnum|
6303|Dateiformat|<=60|alnum|
6305|Verweis auf die Datei|<=60|alnum|K001
6327|Bildinhalt / Dokumenteninhalt|<=60|alnum|K075
6328|Dateicodierung|<=60|alnum|
6329|Inhalt der Datei als base64-kodierte Anlage|<=60|alnum|K001,K100
7251|Bezeichnung des verwendeten Kataloges|<=60|alnum|
7253|Kostenübernahmeerklärung des Auftraggebers liegt vor|1|num|E040
7258|ID Katalog durchgeführte Leistungen|<=60|alnum|
7259|ID Katalog abrechenbare Leistungen|<=60|alnum|
7260|ID Katalog anforderbare Leistungen|1|num|E057,K037,K106
7261|Sonstige Versicherungsnummer|<=60|alnum|
7263|Test-ID|<=60|alnum|
7264|Test-Gerät-UID|<=60|alnum|
7265|Absender des Datensatzes|1|num|E067
7266|Laborart|1|num|E051,K083,K084
7267|ID des Auftraggebers|<=60|alnum|
7268|Fachrichtung oder Stationskennung|<=60|alnum|
7272|Freitext zum Timestamp|<=990|alnum|
7273|Zeitzone|3,5,8,9|alnum|E163
7275|ID verwendeter Terminologie|<=60|alnum|
7276|ID verwendeter Nummernpool|<=60|alnum|
7278|Datum des Timestamp|8|date|F002
7279|Uhrzeit des Timestamp|6,9|num|F016
7280|Grund der Benachrichtigung|1|num|E049
7281|Nachweisverfahren|1|num|E069
7285|Keim-Nummer|<=60|alnum|
7286|Resistenz-Methode|1|num|E059,K085,K086
7287|Wirkstoff-Ident|<=60|alnum|
7288|Wirkstoff-Generic-Nummer|<=60|alnum|
7289|MHK/Breakpoint-Wert|<=60|alnum|
7290|Resistenz-Interpretation|1|num|E030
7292|Lokalisation Probenmaterial|<=60|alnum|
7293|Einheit der Mengenangabe|<=60|alnum|K086
7296|Wiederholungsuntersuchung|1|num|E040
7297|Datum der letzten Untersuchung|8|num|F018
7301|Ergebnis|1|num|E064
7302|Testmethode|<=60|alnum|
7303|Abrechnungsinfo zur Untersuchung|<=2|num|E050,K003,K008,K011,K032,K034,K056,K057,K060,K097,K098,K102,K103,K105,K113,K114
7304|Ergebnis-ID|<=60|alnum|
7305|Befund-ID|<=60|alnum|
7306|Darstellung Ergebniswerte|2|num|E058
7310|Art des Materials|1|num|E033,K038,K039
7311|Organisches Material|1|num|E034,K038
7312|Anorganisches Material|1|num|E035,K038
7313|Art / Rasse / Material|<=60|alnum|K089
7314|Name / Kennung|<=60|alnum|K089
7315|Alter|<=10|num|
7316|Normalwert Listenbezeichnung|<=60|alnum|K055
7317|Normalwert Listenzeile|<=60|alnum|
7318|Nahrungsaufnahme zum Zeitpunkt der Materialentnahme|<=60|alnum|
7319|Identifikationsnummer der Quelle|<=60|alnum|K089
7320|Recall empfohlen|1|num|E011
7321|Status Einsender|2|num|E023,K045,K046,K047,K107
7326|Alter in|1|num|E068
7328|Zusätzliche Namenszeile|<=10|alnum|
7329|Normalbereichsrelevantes Geschlecht|1|alnum|E018
7330|Telefonnummer|<=60|alnum|K059
7331|Mobiltelefonnummer|<=60|alnum|K059
7332|Alternative elektronische Postadresse|<=60|alnum|K059
7333|Faxnummer|<=60|alnum|K059
7334|Webadresse|<=60|alnum|K059
7335|E-Mail-Adresse|<=60|alnum|K059
7336|Gyn. OP, Strahlen- oder Chemotherapie des Genitales|1|num|E040
7337|Gyn. OP, Strahlen- oder Chemotherapie des Genitales – Welche?|<=60|alnum|
7338|Gyn. OP, Strahlen- oder Chemotherapie des Genitales – Wann?|8|num|F018
7339|Gravidität|1|num|E040
7340|Spezifizierung der alternativen elektronischen Postadresse|<=60|alnum|
7351|Geburtsdatum (Tier)|8|date|F002
7352|URL Katalog|<=60|alnum|
7354|Keim/Pilz-Identifizierung|<=60|alnum|
7355|Keim/Pilz-Name|<=120|alnum|
7356|Keim-OID|<=60|alnum|
7357|Wachstum|1|num|E026
7358|Name im Klartext|<=60|alnum|
7359|Wirkstoff-OID|<=60|alnum|
7361|Keim-ID im Katalog|<=60|alnum|
7362|Abrechnungsart PKV|1|num|E024,K033,K034,K093
7363|Alarmwert untere Grenze|<=60|f|
7364|Probengefäß-Ident|<=60|alnum|
7365|Analysen-ID|<=20|alnum|
7366|Langbezeichnung der angeforderten Leistung|<=60|alnum|
7367|Sensitivität|1|alnum|E025
7368|Zellmaterial nicht verwertbar|1|num|E048,K080,K081,K082
7369|MHK-Einheit|<=60|alnum|
7370|Wirkstoff- oder Handelsname|<=60|alnum|
7371|Alarmwert obere Grenze|<=60|f|
7372|Tumorklassifikation|<=60|alnum|
7373|Grading|<=5|alnum|
7374|Stadium|<=5|alnum|
7375|Jahr der Tumordiagnose|4|num|F017
7376|Lokalisation Tumor|<=60|alnum|
7377|Maße|<=60|alnum|
7378|Farbe|<=60|alnum|
7379|Infiltrationstiefe|<=60|alnum|
7380|Ausfluss / pathologische Blutung|1|num|E040
7382|IUP|1|num|E040
7383|Einnahme von Ovulationshemmer / sonstige Hormon-Anwendung|1|num|E040
7384|Klinischer Befund|1|num|E176
7400|HPV-Befund|1|num|E011
7401|High-Risk|1|num|E169
7402|High Risk Typ|<=120|alnum|F024
7403|Low-Risk|1|num|E169
7404|Low Risk Typ|<=120|alnum|F024
7405|Endozervikale Zellen|1|num|E060,K134
7406|Proliferationsgrad|<=10|alnum|K134
7407|Döderleinflora|1|num|E040,K134
7408|Mischflora|1|num|E040,K134
7409|Kokkenflora|1|num|E040,K134
7410|Trichomonaden|1|num|E040,K134
7411|Candida|1|num|E040,K134
7412|Gardnerella|1|num|E040,K134
7413|Codierung der Gruppe|<=4|alnum|E028
7414|Gruppe|<=5|alnum|E028,K134,K125,K126
7415|Zytologische Kontrolle|1|num|E040,K123,K124
7416|Grund der Nachkontrolle|1|num|E061
7417|Abklärungskolposkopie|1|num|E040,K123,K124
7418|p16/Ki67|1|num|E062
7419|L1|1|num|E062
7420|Status Person|2|num|E027,K094,K104
7421|Status Rechnungsempfänger|2|num|E029,K029,K093
7422|Chlamydien|1|num|E062
7423|Erläuterungen|<=990|alnum|
7424|Resistenz erstellt nach|1|num|E065
7425|Extragynäkologische Zytologie|1|num|E063
7426|Neisseria Gonorrhoeae|1|num|E062
7427|Art|1|num|E016
7428|Geschlecht des Tieres|1|num|E165
7429|DRG_Hinweis|<=990|alnum|
7430|Patienten-ID im Selektivvertrag|<=60|alnum|
7431|Fachgebiet|1|num|E164
7432|kastriert/sterilisiert|1|num|E166
7922|Sterbedatum des Patienten|8|date|F002
8000|Satzart|4|num|E004
8001|Satzende|4|num|E004
8002|Objektident|8|alnum|E066
8003|Objektende|8|alnum|E066
# --- Objektattribute (8101–8299): Inhalt = Attributname, danach folgt das Objekt
8101|Abrechnungsinformation||alnum|E071|Obj_0001
8102|Abrechnung_GKV||alnum|E072|Obj_0002
8103|Abrechnung_PKV||alnum|E073|Obj_0003
8104|Abrechnung_IGEL||alnum|E074|Obj_0004
8105|Abrechnung_Sonstige_Kostenuebernahme||alnum|E075|Obj_0005
8106|Abrechnung_Selektivvertrag||alnum|E076|Obj_0006
8107|Anschrift||alnum|E077|Obj_0007
8108|Adressat||alnum|E078|Obj_0008
8109|Abrechnung_OEGD||alnum|E170|Obj_0009
8110|Anhang||alnum|E079|Obj_0010
8111|Antibiogramm||alnum|E080|Obj_0011
8113|Auftragsinformation||alnum|E081|Obj_0013
8114|Arztidentifikation||alnum|E149|Obj_0014
8117|Befundinformationen||alnum|E082|Obj_0017
8118|Abweichender_Befundweg||alnum|E083|Obj_0031
8119|Betriebsstaette||alnum|E084|Obj_0019
8122|Einsenderidentifikation||alnum|E085|Obj_0022
8126|Fehlermeldung_Aufmerksamkeit||alnum|E086|Obj_0026
8127|Veranlassungsgrund||alnum|E087|Obj_0027
8131|Kommunikationsdaten||alnum|E088|Obj_0031
8132|Kopfdaten||alnum|E089|Obj_0032
8134|Krebsfrueherkennung_Zervix-Karzinom||alnum|E090|Obj_0034
8135|Laborergebnisbericht||alnum|E091|Obj_0035
8136|Laborkennung||alnum|E092|Obj_0036
8137|Material||alnum|E093|Obj_0037
8140|Mutterschaft||alnum|E094|Obj_0040
8141|Namenskennung||alnum|E095|Obj_0041
8142|Normalwert||alnum|E096|Obj_0042
8143|Organisation||alnum|E097|Obj_0043
8145|Patient||alnum|E098|Obj_0045
8147|Person||alnum|E099|Obj_0047
8148|RgEmpfaenger||alnum|E100|Obj_0048
8150|Schwangerschaft||alnum|E101|Obj_0050
8151|Sendendes_System||alnum|E102|Obj_0051
8153|Tier_Sonstiges||alnum|E103|Obj_0053
8154|Timestamp||alnum|E104|Obj_0054
8155|Blutgruppenzugehoerigkeit||alnum|E105|Obj_0055
8156|Tumor||alnum|E106|Obj_0056
8158|Untersuchungsabrechnung||alnum|E107|Obj_0058
8159|Untersuchungsanforderung||alnum|E108|Obj_0059
8160|UE_Klinische_Chemie||alnum|E109|Obj_0060
8161|UE_Mikrobiologie||alnum|E110|Obj_0061
8162|UE_Krebsfrueherkennung_Zervix-Karzinom||alnum|E111|Obj_0062
8163|UE_Zytologie||alnum|E112|Obj_0063
8167|Zusaetzliche_Informationen||alnum|E113|Obj_0068
8169|Koerperkenngroessen||alnum|E153|Obj_0069
8170|Medikament||alnum|E152|Obj_0070
8171|Wirkstoff||alnum|E155|Obj_0071
8200|Akutdiagnose||alnum|E116|Obj_0100
8212|Softwareverantwortlicher||alnum|E118|Obj_0043
8213|Timestamp_Erstellung_Untersuchungsanforderung||alnum|E119|Obj_0054
8214|Timestamp_Auftragserteilung||alnum|E120|Obj_0054
8215|Timestamp_Auftragseingang||alnum|E121|Obj_0054
8216|Timestamp_Befunderstellung||alnum|E122|Obj_0054
8217|Praezisierung_Veranlassungsgrund||alnum|E123|Obj_0068
8218|Timestamp_Erstellung_Datensatz||alnum|E124|Obj_0054
8219|Timestamp_Materialabnahme_entnahme||alnum|E125|Obj_0054
8220|Timestamp_Eingangserfassung_Material||alnum|E126|Obj_0054
8221|Timestamp_Erstellung_Laborergebnisbericht||alnum|E127|Obj_0054
8222|Timestamp_Beginn_Analytik||alnum|E128|Obj_0054
8223|Timestamp_Ergebniserstellung||alnum|E129|Obj_0054
8224|Timestamp_QM_Erfassung||alnum|E130|Obj_0054
8225|Timestamp_Messung||alnum|E131|Obj_0054
8226|Timestamp_Gueltig_ab||alnum|E132|Obj_0054
8227|Timestamp_Gueltig_bis||alnum|E133|Obj_0054
8228|Wohnanschrift||alnum|E134|Obj_0007
8229|Anschrift_Arbeitsstelle||alnum|E135|Obj_0007
8230|Rechnungsanschrift||alnum|E136|Obj_0007
8231|Temporaere_Anschrift||alnum|E137|Obj_0007
8232|Private_Kommunikationsdaten||alnum|E138|Obj_0031
8233|Geschaeftliche_Kommunikationsdaten||alnum|E139|Obj_0031
8235|Person_zum_Timestamp||alnum|E141|Obj_0047
8236|Testbezogene_Hinweise||alnum|E142|Obj_0068
8237|Ergebnistext||alnum|E143|Obj_0068
8238|Auftragsbezogene_Hinweise||alnum|E144|Obj_0068
8239|Laborbezeichnung||alnum|E145|Obj_0043
8240|Ueberweisung_von_anderen_Aerzten||alnum|E150|Obj_0014
8241|Ueberweisung_an||alnum|E151|Obj_0068
8242|base64-kodierte_Anlage||alnum|E115|Obj_0068
8243|Timestamp_Zeitpunkt_Medikamenteneinnahme||alnum|E154|Obj_0054
8244|BAK||alnum|E158|Obj_0072
8245|BAK-Ergebnis||alnum|E159|Obj_0068
8246|BAK-Ergebnisbezogene_Hinweise||alnum|E160|Obj_0068
8247|Diagnostische_Bewertung_Empfehlung||alnum|E161|Obj_0068
8248|UE_Sonstige_Untersuchungsergebnisse||alnum|E162|Obj_0073
# ---
8310|Auftragsnummer des Einsenders|<=60|alnum|
8311|Auftragsnummer des Labors|<=60|alnum|
8312|Kunden- (Arzt-) Nummer|<=20|alnum|
8313|ID Nachforderung|<=60|alnum|K114
8315|ID des Empfängers|<=60|alnum|
8316|ID des Senders|<=60|alnum|
8324|ID eines Laborstandortes|<=60|alnum|
8401|Status (Befund/Bericht)|1|alnum|E006,K005,K096
8406|Kosten in (€) Cent|<=60|num|
8410|Test-Ident|<=20|alnum|K003,K010,K011,K037,K106
8411|Testbezeichnung|<=60|alnum|K003
8417|Anlass der Untersuchung|2|num|E146
8418|Ergebnisstatus|2|alnum|E007,K076,K082,K096
8419|Einheitensystem des Messwertes / Wertes|1|num|E070,K002
8420|Ergebnis-Wert|<=60|alnum|
8421|Maßeinheit des Messwertes / Wertes|<=60|alnum|K002
8422|Grenzwertindikator des Laborwerts|<=2|alnum|E005,K099
8423|Pathologisch bekannt|1|num|E011
8424|Normalwertspezifikation|2|num|E052,K054
8427|Spezifizierung des Veranlassungsgrundes|2|num|E147
8428|Probenmaterial-Ident|<=60|alnum|K006
8429|Probenmaterial-Index|<=4|num|E012,K006
8430|Probenmaterial-Bezeichnung|<=60|alnum|K006
8431|Probenmaterial-Spezifikation|<=60|alnum|K006
8434|Anforderungen|<=60|alnum|K010,K037
8460|Normalwert-Text|<=990|alnum|K055
8461|Normalwert untere Grenze|<=60|f|K055
8462|Normalwert obere Grenze|<=60|f|K055
8491|Einwilligungserklärung des Patienten liegt vor (GenDG)|1|num|E011
8501|Dringlichkeit|1|num|E032
8504|Medikamenteneinnahme zum Zeitpunkt der Probenentnahme|1|num|E040
8511|Schwangerschaftsdauer (WWT)|3|num|F005
8512|letzte Periode|8|num|F018
8520|Menge des Probenmaterials|<=60|f|
8522|Sammelzeit des Probenmaterials (hhmm)|4|num|F006
8523|Wirkstoffmenge, Menge / Bezugsmenge, Wirkstärke|<=60|f|
8608|Kommentar / Aktenzeichen|<=60|alnum|
8610|Privattarif|1|num|E017
8611|Zusätzlicher Befundweg|1|num|E013
8614|bereits abgerechnet|1|num|E040
8616|Testungen|1|num|E171
8617|Beauftragungsgrund|1|num|E172,K131,K132
8618|Betreut/untergebracht in|1|num|E011,K131
8619|Tätigkeit in Einrichtung|1|num|E011,K131
8620|Betroffene Einrichtung|1|num|E173,K131
8621|Einverständnis|1|num|E011
8622|Corona-GUID|43|alnum|
8623|Identifikation/Aktenzeichen ÖGD|<=22|alnum|
8624|Covid-Beauftragung|1|num|E174
8625|PLZ ÖGD|5|alnum|
8626|Rechtsgrundlage der Testung|1|num|E175,K131,K132
8627|KV-Sonderziffer|<=5|alnum|K131
8629|Auftrag|<=6|alnum|E178
8630|Auftragsart|1|alnum|E177
8631|Bestätigungsdiagnostik|1|num|E180,K132
8632|Virusvariantendiagnostik|1|num|E181,K135
8990|Namenskürzel / Namenszeichen|<=60|alnum|
9300|Prüfsumme (SHA-1)|40|alnum|E157
9908|Originaldokument: Pfad / Speicherort|<=60|alnum|
9909|Langzeit-Archivierung: Pfad / Speicherort|<=60|alnum|
9970|Dokumententyp|3|alnum|E053,K075
9980|Externe Dokumenten-ID zur Archivierung||alnum|
9981|Dokumentenquelle|1|num|E044
`;

export const ldtRecordTypes: Record<string, string> = {
    '8220': 'L(abor)-Datenpaket-Header',
    '8221': 'L(abor)-Datenpaket-Abschluss',
    '8230': 'P(raxis)-Datenpaket-Header',
    '8231': 'P(raxis)-Datenpaket-Abschluss',
    '8205': 'Befund',
    '8215': 'Auftrag',
};

export const ldtFields = withValues(table(FIELDS, CHECKS), {
    '8000': [ldtRecordTypes, true],
    '8001': [ldtRecordTypes, true],
    '3108': [{ '1': 'Mitglied', '3': 'Familienversicherter', '5': 'Rentner' }, true],
    '3110': [SEX, false],
    '6003': [DIAG_SAFETY, false],
    '8401': [{ '1': 'Auftrag nicht abgeschlossen', '2': 'Auftrag abgeschlossen' }, true],
    '8418': [{
        '01': 'keine gesicherte Information', '02': 'Ergebnis folgt', '03': 'Ergebnis (technisch validiert)',
        '04': 'Ergebnis korrigiert', '05': 'Ergebnis ermittelt (ärztl. validiert, Analytik läuft)',
        '06': 'Befundergebnis', '07': 'Befundergebnis bereits berichtet', '08': 'Befundergebnis korrigiert',
    }, false],
    '8422': [{
        N: 'im Normalbereich / normal', H: 'schwach erhöht', '+': 'schwach erhöht', HH: 'stark erhöht', '++': 'stark erhöht',
        L: 'schwach erniedrigt', '-': 'schwach erniedrigt', LL: 'stark erniedrigt', '--': 'stark erniedrigt',
        '!H': 'extrem erhöht', '!+': 'extrem erhöht', '!L': 'extrem erniedrigt', '!-': 'extrem erniedrigt',
        A: 'auffällig (nicht numerisch)', AA: 'sehr auffällig (nicht numerisch)',
    }, true],
    '4202': [{ '0': 'nein', '1': 'ja' }, false],
    '3473': [BOOL01, false],
});

export const ldtObjects: Record<string, string> = {
    Obj_0001: 'Abrechnungsinformationen', Obj_0002: 'Abrechnung GKV', Obj_0003: 'Abrechnung PKV',
    Obj_0004: 'Abrechnung IGe-Leistungen', Obj_0005: 'Abrechnung sonstige Kostenübernahme',
    Obj_0006: 'Abrechnung Selektivvertrag', Obj_0007: 'Anschrift', Obj_0008: 'Adressat',
    Obj_0009: 'Abrechnung ÖGD', Obj_0010: 'Anhang', Obj_0011: 'Antibiogramm',
    Obj_0013: 'Auftragsinformation', Obj_0014: 'Arztidentifikation', Obj_0017: 'Befundinformationen',
    Obj_0019: 'Betriebsstätte', Obj_0022: 'Einsenderidentifikation', Obj_0026: 'Fehlermeldung/Aufmerksamkeit',
    Obj_0027: 'Veranlassungsgrund', Obj_0031: 'Kommunikationsdaten', Obj_0032: 'Kopfdaten',
    Obj_0034: 'Krebsfrüherkennung Zervix-Karzinom (Muster 39)', Obj_0035: 'Laborergebnisbericht',
    Obj_0036: 'Laborkennung', Obj_0037: 'Material', Obj_0040: 'Mutterschaft', Obj_0041: 'Namenskennung',
    Obj_0042: 'Normalwert', Obj_0043: 'Organisation', Obj_0045: 'Patient', Obj_0047: 'Person',
    Obj_0048: 'RgEmpfänger', Obj_0050: 'Schwangerschaft', Obj_0051: 'Sendendes System',
    Obj_0053: 'Tier/Sonstiges', Obj_0054: 'Timestamp', Obj_0055: 'Blutgruppenzugehörigkeit',
    Obj_0056: 'Tumor', Obj_0058: 'Untersuchungsabrechnung', Obj_0059: 'Untersuchungsanforderung',
    Obj_0060: 'Untersuchungsergebnis Klinische Chemie', Obj_0061: 'Untersuchungsergebnis Mikrobiologie',
    Obj_0062: 'Untersuchungsergebnis Krebsfrüherkennung Zervix-Karzinom', Obj_0063: 'Untersuchungsergebnis Zytologie',
    Obj_0068: 'Fließtext', Obj_0069: 'Koerperkenngroessen', Obj_0070: 'Medikament', Obj_0071: 'Wirkstoff',
    Obj_0072: 'BAK', Obj_0073: 'Sonstige Untersuchungsergebnisse', Obj_0100: 'Diagnose',
};

export const ldtRules: Record<string, string> = {
    F001: 'Format Abrechnungs-VKNR: nnnnn',
    F002: 'Datum JJJJMMTT',
    F003: 'Geburtsdatum JJJJMMTT, zusätzlich JJJJMM00, JJJJ0000, 00000000',
    F004: 'ICD-Code: ann, ann.n, ann.nn, ann.n-, ann.-',
    F005: 'Woche/Tag WWT (T = 0–6)',
    F006: 'Zeitdauer hhmm (hh 00–99, mm 00–59)',
    F007: 'Version LDTn.n.n … LDTn.nn.nnnn',
    F009: 'GNR: nnnnn oder nnnnn + Buchstabe',
    F010: 'BSNR kknnnnnmm (kk gemäß E014)',
    F011: 'LANR nnnnnnmff, Prüfziffer m: Stellen 1–6 abwechselnd ×4/×9, Summe mod 10, 10 − Rest',
    F012: 'KBV-Prüfnummer a/nn/JJMM/MM/aaa',
    F013: 'Versicherten-ID annnnnnnnP mit Prüfziffer',
    F014: 'ASV-Teamnummer 00nnnnnnP',
    F015: 'Blutdruck nnn/nnn',
    F016: 'Uhrzeit hhmmss(ms)',
    F017: 'Jahreszahl JJJJ',
    F018: 'Datum JJJJMMTT, zusätzlich JJJJMM00, JJJJ0000',
    F020: 'PZN nnnnnnnP',
    F021: 'BSNR Terminservicestelle 35kknnnnn',
    F022: 'Pseudo-LANR ASV 555555nff',
    F023: 'Zeitraum in Monaten: n, nn, n-n, n-nn, nn-nn',
    F024: 'HPV-Typ-Nummer bzw. Gruppe (z.B. 18, G1:31/33/52/58)',
    E001: 'zulässiger Inhalt für FK 0001 (aktuell LDT3.2.20)',
    E002: '1 = Mitglied, 3 = Familienversicherter, 5 = Rentner',
    E003: '002–999',
    E004: '8220, 8221, 8230, 8231, 8205, 8215',
    E006: '1 = Auftrag nicht abgeschlossen, 2 = Auftrag abgeschlossen',
};
