import { Logger } from '../utils/logger';
import { EmscriptenFS } from './types';

export class FileSystemManager {
    private logger: Logger;
    private fs!: EmscriptenFS;

    constructor(verbose: boolean = false) {
        this.logger = new Logger(verbose);
    }

    initialize(): void {
        if (!window.FS) {
            throw new Error('Emscripten FS not available');
        }
        this.fs = window.FS;
        this.logger.debug('FileSystem initialized');
    }

    writeFile(path: string, content: string): void {
        try {
            this.ensureDirectory(path);
            this.fs.writeFile(path, content, { encoding: 'utf8' });
            this.logger.debug(`File written: ${path}`);
        } catch (error) {
            throw new Error(`Failed to write file ${path}: ${error}`);
        }
    }

    readFile(path: string): string {
        try {
            const result = this.fs.readFile(path, { encoding: 'utf8' });
            return typeof result === 'string' ? result : new TextDecoder().decode(result as Uint8Array);
        } catch (error) {
            throw new Error(`Failed to read file ${path}: ${error}`);
        }
    }

    fileExists(path: string): boolean {
        try {
            this.fs.stat(path);
            return true;
        } catch {
            return false;
        }
    }

    private ensureDirectory(filePath: string): void {
        const dir = filePath.substring(0, filePath.lastIndexOf('/'));
        if (!dir) return;

        const parts = dir.split('/').filter(p => p);
        let currentPath = '';

        for (const part of parts) {
            currentPath += '/' + part;
            try {
                this.fs.mkdir(currentPath);
            } catch (error: any) {
                if (error.code && error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    deleteFile(path: string): void {
        try {
            if (this.fileExists(path)) {
                this.fs.unlink(path);
                this.logger.debug(`File deleted: ${path}`);
            }
        } catch (error) {
            throw new Error(`Failed to delete file ${path}: ${error}`);
        }
    }
}