export interface WebPerlConfig {
    webperlBasePath?: string;
    perlScriptsPath?: string;
    verbose?: boolean;
}

export interface ScriptRunOptions {
    input: string;
    args?: string[];
    workingDir?: string;
}

export interface ScriptResult {
    success: boolean;
    output: string;
    error?: string;
    exitCode?: number;
}

export interface PerlScript {
    name: string;
    path: string;
    dependencies: string[];
}

export enum ToolType {
    LATEXINDENT = 'latexindent',
    TEXCOUNT = 'texcount',
    TEXFMT = 'texfmt'
}

export interface TexFmtOptions extends ScriptRunOptions {
    wrap?: boolean;
    wraplen?: number;
    tabsize?: number;
    usetabs?: boolean;
}

export interface TexCountOptions extends ScriptRunOptions {
    brief?: boolean;
    total?: boolean;
    sum?: boolean;
    verbose?: number;
    includeFiles?: boolean;
    merge?: boolean;
    additionalFiles?: { path: string; content: string }[];
}

export interface LatexDiffOptions extends ScriptRunOptions {
    oldContent: string;
    type?: 'UNDERLINE' | 'CTRADITIONAL' | 'TRADITIONAL' | 'CFONT' | 'FONTSTRIKE' | 'CCHANGEBAR' | 'CFONTCHBAR' | 'CULINECHBAR' | 'CHANGEBAR' | 'INVISIBLE' | 'BOLD' | 'PDFCOMMENT';
    subtype?: string;
    floattype?: 'FLOATSAFE' | 'IDENTICAL';
    encoding?: string;
    excludeSafecmd?: string;
    appendSafecmd?: string;
    excludeTextcmd?: string;
    appendTextcmd?: string;
    mathMarkup?: number;
    allowSpaces?: boolean;
    flatten?: boolean;
}

export interface EmscriptenFS {
    writeFile(path: string, data: string | Uint8Array, options?: { encoding?: string }): void;
    readFile(path: string, options?: { encoding?: string }): string | Uint8Array;
    mkdir(path: string, mode?: number): void;
    unlink(path: string): void;
    stat(path: string): any;
}

export interface PerlInstance {
    init(callback: () => void): void;
    start(args: string[]): void;
    eval(code: string): any;
    exitStatus: number;
    output: (str: string, chan: number) => void;
}

declare global {
    interface Window {
        Perl: PerlInstance;
        Module: any;
        FS: EmscriptenFS;
    }
}