import { WebPerlRunner } from '../core/webperl-runner';
import { FileSystemManager } from '../core/filesystem-manager';
import { ScriptLoader } from '../core/script-loader';
import { ScriptResult, ScriptRunOptions } from '../core/types';
import { Logger } from '../utils/logger';

export abstract class BaseTool {
    protected runner: WebPerlRunner;
    protected fsManager: FileSystemManager;
    protected scriptLoader: ScriptLoader;
    protected logger: Logger;

    constructor(runner: WebPerlRunner, verbose: boolean = false) {
        this.runner = runner;
        this.logger = new Logger(verbose);
        this.fsManager = new FileSystemManager(verbose);
        this.scriptLoader = new ScriptLoader(this.fsManager, verbose);
    }

    abstract getScriptName(): string;
    abstract getScriptPath(): string;
    abstract getDependencies(): string[];

    protected async ensureLoaded(): Promise<void> {
        if (!this.runner.isInitialized()) {
            await this.runner.initialize();
        }
    }

    protected async executeScript(options: ScriptRunOptions): Promise<ScriptResult> {
        await this.ensureLoaded();

        const timestamp = Date.now();
        const inputPath = `input_${timestamp}.tex`;
        const outputPath = `output_${timestamp}.tex`;

        try {
            const args = this.buildArguments(inputPath, outputPath, options);

            const runData = {
                inputs: [{ fn: inputPath, text: options.input }],
                outputs: [outputPath],
                argv: args
            };

            const result = await this.runWithFiles(runData);

            return result;
        } catch (error) {
            throw error;
        }
    }

    private async runWithFiles(runData: any): Promise<ScriptResult> {
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let exitStatus = 0;

            const messageHandler = (event: MessageEvent) => {
                const data = event.data;

                if (data.perlOutput) {
                    if (data.perlOutput.chan === 1) {
                        stdout += data.perlOutput.data;
                    } else if (data.perlOutput.chan === 2) {
                        stderr += data.perlOutput.data;
                    }
                } else if (data.perlOutputFiles) {
                    if (data.perlOutputFiles.length > 0) {
                        stdout = data.perlOutputFiles[0].text;
                    }
                } else if (data.perlRunnerState === 'Ended') {
                    window.removeEventListener('message', messageHandler);

                    if ('exitStatus' in data) {
                        exitStatus = data.exitStatus;
                    }

                    resolve({
                        success: exitStatus === 0,
                        output: stdout,
                        error: stderr || undefined,
                        exitCode: exitStatus
                    });
                } else if (data.perlRunnerError) {
                    window.removeEventListener('message', messageHandler);
                    reject(new Error(data.perlRunnerError));
                }
            };

            window.addEventListener('message', messageHandler);

            const iframe = document.querySelector('iframe[name="perlrunner"]') as HTMLIFrameElement;
            if (!iframe || !iframe.contentWindow) {
                reject(new Error('Perl runner iframe not found'));
                return;
            }

            iframe.contentWindow.postMessage({ runPerl: runData }, '*');

            setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                reject(new Error('Timeout waiting for script execution'));
            }, 60000);
        });
    }

    protected abstract buildArguments(
        inputPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[];
}