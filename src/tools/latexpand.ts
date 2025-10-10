import { BaseTool } from './base-tool';
import { LatexpandOptions, ScriptResult, ScriptRunOptions } from '../core/types';

export class Latexpand extends BaseTool {
    getScriptPath(): string {
        return '/latexpand.pl';
    }

    getDependencyPaths(): string[] {
        return [];
    }

    async expand(options: LatexpandOptions): Promise<ScriptResult> {
        return this.executeScriptWithWorkDir(options);
    }

    private async executeScriptWithWorkDir(options: LatexpandOptions): Promise<ScriptResult> {
        await this.ensureLoaded();

        const t = Date.now();
        const workDir = `/tmp/work_${t}`;
        const inputPath = `${workDir}/main.tex`;

        const args = this.buildArguments('main.tex', "", '', options);

        const inputs = [
            ...this.preloadedFiles,
            { fn: inputPath, text: options.input },
        ];

        if (options.additionalFiles) {
            for (const file of options.additionalFiles) {
                const fullPath = `${workDir}/${file.path}`;
                inputs.push({ fn: fullPath, text: file.content });
            }
        }

        const result = await this.runner.runScript(args, inputs, undefined, workDir);

        if (result.success && result.output && result.output.trim()) {
            return result;
        }

        if (result.success && (!result.output || !result.output.trim())) {
            return {
                success: false,
                output: '',
                error: `Latexpand produced no output. Exit code: ${result.exitCode}\nSTDOUT length: ${result.output?.length || 0}\nSTDERR: ${result.error || 'none'}`,
                exitCode: result.exitCode
            };
        }

        return result;
    }

    protected buildArguments(
        inputPath: string,
        newPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[] {
        const expandOptions = options as LatexpandOptions;
        const scriptPath = this.getScriptPath();

        const args = [scriptPath];

        if (expandOptions.keepComments) args.push('--keep-comments');
        if (expandOptions.keepIncludes) args.push('--keep-includes');
        if (expandOptions.emptyComments) args.push('--empty-comments');
        if (expandOptions.defines) {
            for (const [key, value] of Object.entries(expandOptions.defines)) {
                args.push('--define', `${key}=${value}`);
            }
        }
        if (expandOptions.explain) args.push('--explain');
        if (expandOptions.showGraphics) args.push('--show-graphics');
        if (expandOptions.graphicsExtensions) {
            args.push('--graphics-extensions', expandOptions.graphicsExtensions);
        }
        if (expandOptions.expandUsepackage) args.push('--expand-usepackage');
        if (expandOptions.expandBbl) args.push('--expand-bbl', expandOptions.expandBbl);
        if (expandOptions.biber) args.push('--biber', expandOptions.biber);
        if (expandOptions.fatal) args.push('--fatal');
        if (expandOptions.makeatletter) args.push('--makeatletter');

        if (expandOptions.args) args.push(...expandOptions.args);

        args.push(inputPath);

        return args;
    }
}