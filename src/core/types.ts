/** Language ids contributed by the extension */
export type Dialect = 'gdt' | 'ldt' | 'kvdt';

/**
 * Concrete profile of a file. Legacy profiles (gdt2/ldt2) have no object
 * structure (8002/8003) and use FK 8100 as "Satzlänge".
 */
export type Profile = 'gdt2' | 'gdt3' | 'ldt2' | 'ldt3' | 'kvdt';

export type Severity = 'error' | 'warning' | 'info' | 'hint';

/** Semantic content checks that go beyond length/type */
export type CheckKind =
    | 'date'        // JJJJMMTT, real calendar date
    | 'birthdate'   // JJJJMMTT, additionally JJJJMM00 / JJJJ0000 / 00000000
    | 'dateLoose'   // JJJJMMTT, additionally JJJJMM00 / JJJJ0000
    | 'dateRange'   // JJJJMMTTJJJJMMTT
    | 'time'        // hhmmss[mmm]
    | 'hhmm'
    | 'timestamp14' // JJJJMMTThhmmss
    | 'quarter'     // QJJJJ
    | 'lanr'        // 9 digits with modulo-10 check digit (weights 4/9)
    | 'bsnr'        // 9 digits, KV prefix
    | 'kvnr'        // Versicherten-ID annnnnnnnP with check digit
    | 'icd'
    | 'ldtVersion'; // LDTn.n.n

export interface FieldDef {
    fk: string;
    name: string;
    nameEn?: string;
    /** length spec as in the KBV tables: "9", "<=60", "6-12", "3,5,6" */
    len?: string;
    /** num | alnum | date | f  (KVDT: n | a | d) */
    type?: string;
    rules?: string[];
    /** object attribute: id of the object that has to follow */
    obj?: string;
    /** object attribute: canonical content */
    attr?: string;
    values?: Record<string, string>;
    /** true if `values` is the complete list of allowed contents */
    closed?: boolean;
    check?: CheckKind;
    note?: string;
}

export interface ResolvedField {
    def: FieldDef;
    /** false: description only (e.g. legacy profile using a newer table) */
    validate: boolean;
    source: string;
}

export interface Dictionary {
    profile: Profile;
    field(fk: string): ResolvedField | undefined;
    recordType(type: string): string | undefined;
    objectName(id: string): string | undefined;
    rule(id: string): string | undefined;
    /** all fields (for completion) */
    allFields(): FieldDef[];
}

export interface Problem {
    line: number;
    startCol: number;
    endCol: number;
    severity: Severity;
    code: string;
    message: string;
    /** replacement text for quick fixes */
    fix?: { startCol: number; endCol: number; text: string; title: string };
}
