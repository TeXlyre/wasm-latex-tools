import { BaseTool } from './base-tool';
import { LatexIndentOptions, ScriptResult, ScriptRunOptions } from '../core/types';

export class LatexIndent extends BaseTool {
    getScriptName(): string {
        return 'latexindent';
    }

    getScriptPath(): string {
        return '/latexindent.pl';
    }

    getDependencies(): string[] {
        return [];
    }

    async format(options: LatexIndentOptions): Promise<ScriptResult> {
        return this.executeScript(options);
    }

    protected buildArguments(
        inputPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[] {
        const latexOptions = options as LatexIndentOptions;
        const scriptPath = `/perl${this.getScriptPath()}`;

        const args = [scriptPath, inputPath, '-o', outputPath];

        if (latexOptions.silent) args.push('-s');
        if (latexOptions.localSettings) args.push('-l', latexOptions.localSettings);
        if (latexOptions.args) args.push(...latexOptions.args);

        return args;
    }
}