import { WebPerlRunner } from '../core/webperl-runner';
import { ScriptResult, ScriptRunOptions, LatexDiffOptions } from '../core/types';
import { Logger } from '../utils/logger';

type VfsInput = { fn: string; text: string };

export abstract class BaseTool {
    protected runner: WebPerlRunner;
    protected logger: Logger;
    private filesLoaded = false;
    public preloadedFiles: VfsInput[] = [];

    constructor(runner: WebPerlRunner, verbose: boolean = false) {
        this.runner = runner;
        this.logger = new Logger(verbose);
    }

    abstract getScriptPath(): string;
    abstract getDependencyPaths(): string[];

    protected async ensureLoaded(): Promise<void> {
        if (!this.runner.isInitialized()) {
            await this.runner.initialize();
        }
        if (!this.filesLoaded) {
            await this.fetchAllFiles();
            this.filesLoaded = true;
        }
    }

    private async fetchAllFiles(): Promise<void> {
        const config = this.runner.getConfig();
        const filesToLoad = [
            { path: this.getScriptPath(), virtual: this.getScriptPath() },
            ...this.getDependencyPaths().map(path => ({ path, virtual: path })),
        ];

        const inputs: VfsInput[] = [];
        for (const file of filesToLoad) {
            const url = `${config.perlScriptsPath}${file.path}`;
            this.logger.debug(`Fetching file from ${url}`);
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
                const content = await resp.text();
                inputs.push({ fn: file.virtual, text: content });
                this.logger.debug(`Fetched: ${file.path}`);
            } catch (err) {
                throw new Error(`Failed to load file ${file.path}: ${err}`);
            }
        }
        this.preloadedFiles = inputs;
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

    protected async executeScript(options: ScriptRunOptions): Promise<ScriptResult> {
        await this.ensureLoaded();

        const t = Date.now();
        const inputPath = `/tmp/input_${t}.tex`;
        const outputPath = `/tmp/output_${t}.tex`;

        const args = this.buildArguments(inputPath, "", outputPath, options);

        const inputs = [
            ...this.preloadedFiles,
            { fn: inputPath, text: options.input },
        ];
        const outputs = [outputPath];

        return this.runner.runScript(args, inputs, outputs);
    }

    protected abstract buildArguments(
        inputPath: string,
        newPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[];
}