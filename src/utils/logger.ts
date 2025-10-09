export class Logger {
    constructor(private verbose: boolean = false) { }

    debug(message: string, ...args: any[]): void {
        if (this.verbose) {
            console.debug(`[WebPerl Debug] ${message}`, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        console.info(`[WebPerl] ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[WebPerl Warning] ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`[WebPerl Error] ${message}`, ...args);
    }
}