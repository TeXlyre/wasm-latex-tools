import { PerlScript } from './types';
import { FileSystemManager } from './filesystem-manager';
import { Logger } from '../utils/logger';

export class ScriptLoader {
    private fsManager: FileSystemManager;
    private logger: Logger;
    private loadedScripts: Set<string> = new Set();

    constructor(fsManager: FileSystemManager, verbose: boolean = false) {
        this.fsManager = fsManager;
        this.logger = new Logger(verbose);
    }

    async loadScript(script: PerlScript, basePath: string): Promise<void> {
        if (this.loadedScripts.has(script.name)) {
            this.logger.debug(`Script already loaded: ${script.name}`);
            return;
        }

        this.logger.info(`Loading script: ${script.name}`);

        try {
            await this.loadDependencies(script, basePath);
            await this.loadMainScript(script, basePath);

            this.loadedScripts.add(script.name);
            this.logger.info(`Script loaded successfully: ${script.name}`);
        } catch (error) {
            throw new Error(`Failed to load script ${script.name}: ${error}`);
        }
    }

    private async loadDependencies(script: PerlScript, basePath: string): Promise<void> {
        for (const dep of script.dependencies) {
            await this.loadFile(dep, basePath);
        }
    }

    private async loadMainScript(script: PerlScript, basePath: string): Promise<void> {
        await this.loadFile(script.path, basePath);
    }

    private async loadFile(path: string, basePath: string): Promise<void> {
        const fullUrl = `${basePath}${path}`;
        const virtualPath = `/perl${path}`;

        try {
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            this.fsManager.writeFile(virtualPath, content);

            this.logger.debug(`Loaded file: ${virtualPath}`);
        } catch (error) {
            throw new Error(`Failed to fetch ${fullUrl}: ${error}`);
        }
    }

    isLoaded(scriptName: string): boolean {
        return this.loadedScripts.has(scriptName);
    }
}