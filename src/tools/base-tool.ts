// base-tool.ts (new)
import { WebPerlRunner } from '../core/webperl-runner';
import { ScriptResult, ScriptRunOptions } from '../core/types';
import { Logger } from '../utils/logger';

type VfsInput = { fn: string; text: string };

export abstract class BaseTool {
    protected runner: WebPerlRunner;
    protected logger: Logger;
    private filesLoaded = false;
    private preloadedFiles: VfsInput[] = []; // ⬅ cache files instead of writing via Perl

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
            await this.fetchAllFiles();     // ⬅ just fetch & cache
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
        this.preloadedFiles = inputs; // ⬅ keep in memory
    }

    protected async executeScript(options: ScriptRunOptions): Promise<ScriptResult> {
        await this.ensureLoaded();

        const t = Date.now();
        const inputPath = `/tmp/input_${t}.tex`;
        const outputPath = `/tmp/output_${t}.tex`;

        const args = this.buildArguments(inputPath, outputPath, options);

        // ⬅ SINGLE run: write all deps + main script + this run’s input
        const inputs = [
            ...this.preloadedFiles,
            { fn: inputPath, text: options.input },
        ];
        const outputs = [outputPath];

        return this.runner.runScript(args, inputs, outputs);
    }

    protected abstract buildArguments(
        inputPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[];
}
