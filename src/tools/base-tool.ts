import { WebPerlRunner } from '../core/webperl-runner';
import { ScriptResult, ScriptRunOptions } from '../core/types';
import { Logger } from '../utils/logger';

export abstract class BaseTool {
    protected runner: WebPerlRunner;
    protected logger: Logger;
    private scriptContent: string | null = null;

    constructor(runner: WebPerlRunner, verbose: boolean = false) {
        this.runner = runner;
        this.logger = new Logger(verbose);
    }

    abstract getScriptPath(): string;

    protected async ensureLoaded(): Promise<void> {
        if (!this.runner.isInitialized()) {
            await this.runner.initialize();
        }

        if (!this.scriptContent) {
            await this.loadScriptContent();
        }
    }

    private async loadScriptContent(): Promise<void> {
        const scriptPath = this.getScriptPath();
        const config = this.runner.getConfig();
        const scriptUrl = `${config.perlScriptsPath}${scriptPath}`;

        this.logger.debug(`Loading Perl script from ${scriptUrl}`);

        try {
            const response = await fetch(scriptUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.scriptContent = await response.text();
            this.logger.debug(`Script loaded: ${scriptPath}`);
        } catch (error) {
            throw new Error(`Failed to load script ${scriptPath}: ${error}`);
        }
    }

    protected async executeScript(options: ScriptRunOptions): Promise<ScriptResult> {
        await this.ensureLoaded();

        const timestamp = Date.now();
        const inputPath = `/tmp/input_${timestamp}.tex`;
        const outputPath = `/tmp/output_${timestamp}.tex`;
        const scriptPath = `/tmp/script_${timestamp}.pl`;

        const args = this.buildArguments(inputPath, outputPath, options);

        const inputs = [
            { fn: inputPath, text: options.input },
            { fn: scriptPath, text: this.scriptContent! }
        ];
        const outputs = [outputPath];

        // Update first arg to use the temp script path
        args[0] = scriptPath;

        return this.runner.runScript(args, inputs, outputs);
    }

    protected abstract buildArguments(
        inputPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[];
}