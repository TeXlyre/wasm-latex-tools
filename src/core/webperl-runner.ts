import { WebPerlConfig, ScriptResult } from './types';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

export class WebPerlRunner {
    private config: Required<WebPerlConfig>;
    private logger: Logger;
    private initialized: boolean = false;
    private initializing: boolean = false;
    private perlRunnerIframe: HTMLIFrameElement | null = null;
    private perlRunner: Window | null = null;

    constructor(config: WebPerlConfig = {}) {
        this.config = {
            webperlBasePath: config.webperlBasePath || '/core/webperl',
            perlScriptsPath: config.perlScriptsPath || '/core/perl',
            verbose: config.verbose ?? false
        };
        this.logger = new Logger(this.config.verbose);
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initializing) {
            await this.waitForInitialization();
            return;
        }

        this.initializing = true;
        this.logger.info('Initializing WebPerl...');

        try {
            await this.loadPerlRunner();
            this.initialized = true;
            this.logger.info('WebPerl initialized successfully');
        } catch (error) {
            this.initializing = false;
            throw ErrorHandler.handle(error, 'Failed to initialize WebPerl');
        } finally {
            this.initializing = false;
        }
    }

    private async loadPerlRunner(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for Perl runner to initialize'));
            }, 30000);

            const messageHandler = (event: MessageEvent) => {
                const data = event.data;

                if (data.perlRunnerState === 'Ready') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    this.perlRunner = event.source as Window;
                    this.logger.debug('Perl runner is ready');
                    resolve();
                }
            };

            window.addEventListener('message', messageHandler);

            this.perlRunnerIframe = document.createElement('iframe');
            this.perlRunnerIframe.name = 'perlrunner';
            this.perlRunnerIframe.src = `${this.config.webperlBasePath}/perlrunner.html`;
            this.perlRunnerIframe.style.display = 'none';

            this.perlRunnerIframe.onerror = () => {
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                reject(new Error(`Failed to load ${this.config.webperlBasePath}/perlrunner.html`));
            };

            document.body.appendChild(this.perlRunnerIframe);

            const pollForRunner = setInterval(() => {
                const runnerFrame = this.perlRunnerIframe?.contentWindow;
                if (runnerFrame) {
                    runnerFrame.postMessage(
                        { perlRunnerDiscovery: 1 },
                        '*'
                    );
                }
            }, 100);

            setTimeout(() => clearInterval(pollForRunner), 30000);
        });
    }

    private async waitForInitialization(): Promise<void> {
        while (this.initializing) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!this.initialized) {
            throw new Error('WebPerl initialization failed');
        }
    }

    async runScript(
        argv: string[],
        inputs?: { fn: string; text: string }[],
        outputs?: string[],
        workingDir?: string
    ): Promise<ScriptResult> {
        if (!this.initialized || !this.perlRunner) {
            throw new Error('WebPerl not initialized. Call initialize() first.');
        }

        const sortedInputs = this.sortInputsByDepth(inputs || []);

        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let exitStatus = 0;
            const outputFiles: { fn: string; text: string }[] = [];

            const messageHandler = (event: MessageEvent) => {
                const data = event.data;

                if (data.perlOutput) {
                    if (data.perlOutput.chan === 1) {
                        stdout += data.perlOutput.data;
                    } else if (data.perlOutput.chan === 2) {
                        stderr += data.perlOutput.data;
                    }
                } else if (data.perlOutputFiles) {
                    outputFiles.push(...data.perlOutputFiles);
                } else if (data.perlRunnerState === 'Ended') {
                    window.removeEventListener('message', messageHandler);

                    if ('exitStatus' in data) {
                        exitStatus = data.exitStatus;
                    }

                    if (outputFiles.length > 0) {
                        stdout = outputFiles[0].text;
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

            const runData: any = { argv };
            if (sortedInputs.length > 0) runData.inputs = sortedInputs;
            if (outputs) runData.outputs = outputs;
            if (workingDir) runData.cwd = workingDir;

            if (!this.perlRunner) {
                window.removeEventListener('message', messageHandler);
                reject(new Error('Perl runner not available'));
                return;
            }

            this.perlRunner.postMessage({ runPerl: runData }, '*');

            setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                reject(new Error('Timeout waiting for script execution'));
            }, 60000);
        });
    }

    private sortInputsByDepth(inputs: { fn: string; text: string }[]): { fn: string; text: string }[] {
        return inputs.slice().sort((a, b) => {
            const depthA = a.fn.split('/').length;
            const depthB = b.fn.split('/').length;
            return depthA - depthB;
        });
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    getConfig(): Required<WebPerlConfig> {
        return { ...this.config };
    }
}