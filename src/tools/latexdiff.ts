import { BaseTool } from './base-tool';
import { LatexDiffOptions, ScriptResult, ScriptRunOptions } from '../core/types';

export class LatexDiff extends BaseTool {
    getScriptPath(): string {
        return '/latexdiff.pl';
    }

    getDependencyPaths(): string[] {
        return [];
    }

    async diff(oldContent: string, newContent: string, options?: LatexDiffOptions): Promise<ScriptResult> {
        const mergedOptions: LatexDiffOptions = {
            input: newContent,
            oldContent,
            ...options
        };
        return this.executeLatexDiff(mergedOptions);
    }

    protected async executeLatexDiff(options: LatexDiffOptions): Promise<ScriptResult> {
        await this.ensureLoaded();

        const t = Date.now();
        const oldPath = `/tmp/old_${t}.tex`;
        const newPath = `/tmp/new_${t}.tex`;
        const outputPath = `/tmp/diff_${t}.tex`;

        const args = this.buildArguments(oldPath, newPath, outputPath, options);

        const inputs = [
            ...this.preloadedFiles,
            { fn: oldPath, text: options.oldContent },
            { fn: newPath, text: options.input }
        ];
        const outputs = [outputPath];

        return this.runner.runScript(args, inputs, outputs);
    }

    protected buildArguments(
        oldPath: string,
        newPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[] {
        const diffOptions = options as LatexDiffOptions;
        const scriptPath = this.getScriptPath();

        const args = [scriptPath];

        if (diffOptions.type) args.push(`--type=${diffOptions.type}`);
        if (diffOptions.subtype) args.push(`--subtype=${diffOptions.subtype}`);
        if (diffOptions.floattype) args.push(`--floattype=${diffOptions.floattype}`);
        if (diffOptions.encoding) args.push(`--encoding=${diffOptions.encoding}`);
        if (diffOptions.excludeSafecmd) args.push(`--exclude-safecmd=${diffOptions.excludeSafecmd}`);
        if (diffOptions.appendSafecmd) args.push(`--append-safecmd=${diffOptions.appendSafecmd}`);
        if (diffOptions.excludeTextcmd) args.push(`--exclude-textcmd=${diffOptions.excludeTextcmd}`);
        if (diffOptions.appendTextcmd) args.push(`--append-textcmd=${diffOptions.appendTextcmd}`);
        if (diffOptions.mathMarkup !== undefined) args.push(`--math-markup=${diffOptions.mathMarkup}`);
        if (diffOptions.allowSpaces) args.push('--allow-spaces');
        if (diffOptions.flatten) args.push('--flatten');

        args.push(oldPath, newPath);

        return args;
    }
}