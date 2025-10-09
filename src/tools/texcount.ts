import { BaseTool } from './base-tool';
import { TexCountOptions, ScriptResult, ScriptRunOptions } from '../core/types';

export class TexCount extends BaseTool {
    getScriptPath(): string {
        return '/texcount.pl';
    }

    getDependencyPaths(): string[] {
        return ['/Algorithm/Diff.pm',];
    }

    async count(options: TexCountOptions): Promise<ScriptResult> {
        return this.executeScript(options);
    }

    protected buildArguments(
        inputPath: string,
        newPath: "",
        outputPath: string,
        options: ScriptRunOptions
    ): string[] {
        const texOptions = options as TexCountOptions;
        const scriptPath = this.getScriptPath();

        const args = [scriptPath];

        if (texOptions.brief) args.push('-brief');
        if (texOptions.total) args.push('-total');
        if (texOptions.sum) args.push('-sum');
        if (texOptions.verbose !== undefined) args.push(`-v${texOptions.verbose}`);
        if (texOptions.args) args.push(...texOptions.args);

        args.push(inputPath);

        return args;
    }

    parseOutput(output: string): TexCountResult {
        const lines = output.trim().split('\n');
        const result: TexCountResult = {
            words: 0,
            headers: 0,
            captions: 0,
            raw: output
        };

        for (const line of lines) {
            if (line.includes('Words in text:')) {
                result.words = parseInt(line.split(':')[1].trim(), 10) || 0;
            } else if (line.includes('Words in headers:')) {
                result.headers = parseInt(line.split(':')[1].trim(), 10) || 0;
            } else if (line.includes('Words outside text')) {
                result.captions = parseInt(line.split(':')[1].trim(), 10) || 0;
            }
        }

        return result;
    }
}

export interface TexCountResult {
    words: number;
    headers: number;
    captions: number;
    raw: string;
}