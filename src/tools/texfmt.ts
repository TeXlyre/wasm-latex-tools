import { TexFmtOptions, ScriptResult } from '../core/types';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

export class TexFmt {
    private logger: Logger;
    private wasmInitialized: boolean = false;
    private wasmModule: any = null;
    private wasmBasePath: string;

    constructor(verbose: boolean = false, wasmBasePath: string = '/core/texfmt') {
        this.logger = new Logger(verbose);
        this.wasmBasePath = wasmBasePath;
    }

    private async ensureWasmLoaded(): Promise<void> {
        if (this.wasmInitialized && this.wasmModule) {
            return;
        }

        try {
            const wasmModule = await import(/* webpackIgnore: true */ `${this.wasmBasePath}/tex_fmt.js`);
            await wasmModule.default();
            this.wasmModule = wasmModule;
            this.wasmInitialized = true;
            this.logger.debug('tex-fmt WASM module initialized');
        } catch (error) {
            throw ErrorHandler.handle(error, 'Failed to load tex-fmt WASM module');
        }
    }

    private buildConfig(options: TexFmtOptions): string {
        const config: string[] = ['# tex-fmt.toml'];

        if (options.wrap !== undefined) {
            config.push(`wrap = ${options.wrap}`);
        }
        if (options.wraplen !== undefined) {
            config.push(`wraplen = ${options.wraplen}`);
        }
        if (options.tabsize !== undefined) {
            config.push(`tabsize = ${options.tabsize}`);
        }
        if (options.usetabs !== undefined) {
            config.push(`tabchar = "${options.usetabs ? 'tab' : 'space'}"`);
        }

        config.push('lists = []');
        config.push('no-indent-envs = []');

        return config.join('\n');
    }

    async format(options: TexFmtOptions): Promise<ScriptResult> {
        await this.ensureWasmLoaded();

        try {
            const config = this.buildConfig(options);
            this.logger.debug(`Running tex-fmt with config:\n${config}`);

            const result = this.wasmModule.main(options.input, config);

            return {
                success: true,
                output: result.output,
                error: result.logs || undefined,
                exitCode: 0
            };
        } catch (error) {
            const errorMsg = ErrorHandler.getMessage(error);
            this.logger.error('tex-fmt formatting failed:', errorMsg);

            return {
                success: false,
                output: '',
                error: errorMsg,
                exitCode: 1
            };
        }
    }
}