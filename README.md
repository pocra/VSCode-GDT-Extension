# xDT Language Support – GDT, LDT & KVDT

Visual Studio Code extension for the German healthcare interchange formats of the xDT family:

| Dialect | Versions | File extensions | Reference |
|---|---|---|---|
| **GDT** – Geräte-Daten-Transfer | 2.1 (legacy) and 3.x / **3.5.3** | `.gdt` | QMS e.V., GDT 3.5 Satzbeschreibung 3.5.3 (05.03.2024) |
| **LDT** – Labor-Daten-Transfer | 2.x (names only) and **3.2.20** | `.ldt` | KBV, LDT 3 Satzbeschreibung 3.2.20 (in force 01.10.2026) |
| **KVDT** – Abrechnung | Container + **ADT**, version **6.09** | `.con`, `.kvdt` | KBV, Datensatzbeschreibung KVDT 6.09 (from Q1/2027) |

Fork of [Lixfeld/VSCode-GDT-Extension](https://github.com/Lixfeld/VSCode-GDT-Extension) (MIT). All GDT 2.x descriptions, the
`*.gdt` TextMate scopes and the command ids `gdt.FixLengthVariables` / `gdt.DisplayMessage` are kept.

Files are recognised by extension and – for unknown extensions – by their first line (`8000` + record type).

## Features

**Syntax highlighting** – length, field identifier, content; record types, object idents (`8002/8003`), object attributes
(`8100–8299`), patient fields (`3xxx`) and free-text fields get their own scopes (`variable.<lang>`, `keyword.<lang>`,
`keyword.other.object.<lang>`, `keyword.other.attribute.<lang>`, `entity.name.class.<lang>`, `entity.name.type.<lang>`,
`keyword.control.<lang>`, `constant.character.escape.<lang>`, `string.<lang>`, `comment.<lang>`).

**Diagnostics with quick fixes**
- field length (`content + 9`, ISO 8859-15 = 1 byte per character) – quick fix per line or for the whole file
- GDT 2.x / LDT 2.x record length `8100` (Satzlänge)
- `8000`/`8001` pairing, `8002`/`8003` nesting, empty objects, object attribute without object, object id expected by the attribute
- characters outside ISO 8859-15, UTF-8 mojibake (`Ã¼`), LF instead of CR/LF, empty fields
- per field (from the official field tables): length, type, date/time formats, closed value lists,
  LANR and Versicherten-ID check digits, BSNR KV prefix, ICD format, quarter `QJJJJ`
- file envelope: `con0 … con9` (KVDT), `8220 … 8221` / `8230 … 8231` (LDT)

**Base64 attachments** (FK 6329, e.g. the PDF in `Obj_0010 Anhang`)
- collapsed automatically when a file is opened (`xdt.attachments.foldOnOpen`), type and size shown behind the first line
- CodeLens above the attachment: *anzeigen*, *Speichern unter …*, *Base64 einklappen*
- file type is detected from the content (PDF, PNG, JPEG, GIF, TIFF, ZIP, XML, HL7, text, embedded LDT/GDT/KVDT) with FK 6303 as fallback
- PDFs open in the system viewer (or in VS Code with a PDF extension: `xdt.attachments.pdfViewer = vscode`), images in VS Code,
  embedded xDT/text files as a new unsaved editor tab with full xDT support
- broken base64 (invalid characters, missing lines) is reported
- decoded files for viewing are written to a temporary folder (`<tmp>/vscode-xdt-<pid>`), which is deleted when VS Code closes –
  they contain patient data, use *Speichern unter …* deliberately

**LDT checksum** – FK `9300` (SHA-1 over all preceding bytes in ISO 8859-15 incl. CR/LF) is verified and recomputed by
*Feld- und Satzlängen korrigieren*; verified against the KBV LDT 3.2.20 test files.

**Hovers** on length (expected value), field identifier (name, length, type, rules, object attribute target, object path)
and content (record type, object name, meaning of coded values, formatted dates/times).

**Outline / breadcrumbs / folding** – records and nested objects (`Satz 8205 › Laborergebnisbericht › UE_Klinische_Chemie › Normalwert`),
patient name in the record detail. Optional: individual fields (`xdt.outline.showFields`).

**Completion** – field identifiers at the start of a line; after an object attribute the matching `8002/8003` pair is offered.

**Commands** (`xDT: …`)
- *Feld- und Satzlängen korrigieren* (optionally on save: `xdt.fixLengthsOnSave`)
- *Nachricht mit Beschreibungen anzeigen* – indented output channel view incl. decoded values
- *Patientendaten anonymisieren* – replaces configurable fields (`xdt.anonymize.fields`) by placeholders, fixes lengths afterwards
- *Zeilenenden auf CR/LF umstellen*

**Status bar** – detected profile and version (`LDT 3 · LDT3.2.20`, `GDT 2.x · 02.10`, `KVDT · ADT0127.01`).

## Encoding

xDT files are ISO 8859-15 with CR/LF. The extension sets for all three languages
`files.encoding = iso885915`, `files.eol = \r\n` and `files.trimTrailingWhitespace = false`.
Old GDT 2.x devices sometimes write CP437 (`9206 = 2`) – override per workspace:

```json
"[gdt]": { "files.encoding": "cp437" }
```

## Settings

| Setting | Default | |
|---|---|---|
| `xdt.language` | `German` | `English` only affects GDT 2.x descriptions |
| `xdt.customFieldIdentifiers` / `xdt.customRecordTypes` | `{}` | add or override descriptions (old `gdt.Custom*` settings are still read) |
| `xdt.validation.enabled` | `true` | structure and field checks (field lengths are always checked) |
| `xdt.validation.fieldFormat` | `true` | checks against the field tables |
| `xdt.validation.checksums` | `true` | LANR / Versicherten-ID check digits |
| `xdt.validation.unknownFields` | `hint` | `off` / `hint` / `info` |
| `xdt.fixLengthsOnSave` | `false` | |
| `xdt.outline.showFields` | `false` | |
| `xdt.anonymize.fields` | patient fields | FKs replaced by *anonymisieren* |
| `xdt.attachments.foldOnOpen` | `true` | collapse base64 attachments on open |
| `xdt.attachments.inlineInfo` | `true` | type/size behind the first base64 line |
| `xdt.attachments.pdfViewer` | `system` | `system` or `vscode` |

## Known limitations

- KVDT: only container and ADT field tables are included; KADT, SADT and Hybrid-DRG specific fields are reported as unknown (hint).
- Context rules (`Kxxx` / KVDT "Kontext") and existence checks against KBV master data (SDICD, EBM, Kassendatei) are not implemented.
- LDT 2.x / GDT 2.x: names only, no field-level validation (different date formats, e.g. `3103` = `TTMMJJJJ` in GDT 2.1).
- The GDT 3.5 *Anhang* (device-specific `8402` values, Anhang D optional objects) is not included.

## Development

```bash
npm install
npm test                       # compiles and runs the vscode-independent core tests
XDT_KBV_TESTDATA=~/LDT-Testdateien npm test   # additionally checks the KBV test files (not included)
node scripts/make-samples.js   # regenerates ./samples (valid example files for all profiles)
npx vsce package               # builds the .vsix
```

Press `F5` in VS Code to start an Extension Development Host. Field tables live in `src/dictionaries/*.ts` in a compact
`FK|Name|Länge|Typ|Regeln|Objekt` format, so updating to a new KBV release is mostly a matter of editing those lines.
