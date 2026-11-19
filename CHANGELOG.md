# Change Log

## 3.1.1
- Fix: extension was not activated when opening GDT/LDT/KVDT files (explicit `activationEvents`)

## 3.1.0
- Base64 attachments (FK 6329): auto-fold, inline type/size, CodeLens to view / save, content-based type detection,
  embedded LDT/GDT/KVDT opens as xDT document, validation of the base64 content
- LDT FK 9300: SHA-1 checksum is verified and recomputed by "Feld- und Satzlängen korrigieren"
- Fix: Versicherten-ID check digit is `sum mod 10` (verified against KBV test data)
- Empty FK 3564 lines (blank lines in Obj_Fließtext) are no longer reported
- Output channel shows a single summary line per attachment instead of thousands of base64 lines

## 3.0.0 (fork: xDT)
- New languages **LDT** (`.ldt`) and **KVDT** (`.con`) next to GDT, detection by first line
- GDT 3.5 support: object structure, GDT-specific objects (Obj_0012/0033/0057), LDT-based field table
- Field tables LDT 3.2.20 and KVDT 6.09 (container + ADT) with lengths, types, rules and value lists
- Diagnostics + quick fixes (field length, GDT/LDT 2.x record length 8100, record/object structure, charset, CR/LF, formats, check digits)
- Hover provider replaces the decoration tooltips; outline, breadcrumbs, folding, completion
- Commands: fix lengths (optionally on save), structured message view, anonymize patient data, CR/LF
- Encoding defaults (ISO 8859-15, CR/LF, no trailing-whitespace trimming)
- Status bar with detected profile/version

## 2.0.0
- New Option: Add custom field identifiers and record types
- Converting existing JavaScript to TypeScript

## 1.2.1
- Fix: Display message (command) with non-default field types
- Add german header for message output

## 1.2.0
- New command: Output message with fields and descriptions
- New command: Fix length of line variables

## 1.1.0
- Add german and english descriptions for field and record types
- Add tooltips and configuration *(select language)*

## 1.0.0
- Initial release
