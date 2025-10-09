import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

import {
    WebPerlRunner,
    TexCount,
    TexFmt,
    TexCountOptions,
    TexFmtOptions
} from '../../../src';

import './styles.css';

const sampleLatex = `\\documentclass{article}
\\usepackage{amsmath}

\\begin{document}

\\section{Introduction}
This is a sample LaTeX document.

\\subsection{Math Example}
Here is an equation:
\\begin{equation}
E = mc^2
\\end{equation}

\\end{document}`;

class LatexToolsDemo {
    private inputEditor: EditorView;
    private outputView: HTMLElement;
    private runner: WebPerlRunner;
    // private latexIndent: LatexIndent;
    private texCount: TexCount;
    private texFmt: TexFmt;
    private currentTool: 'texcount' | 'texfmt' = 'texfmt';

    constructor() {
        this.runner = new WebPerlRunner({
            webperlBasePath: '/webperl',
            perlScriptsPath: '/perl',
            verbose: true
        });

        // this.latexIndent = new LatexIndent(this.runner, true);
        this.texCount = new TexCount(this.runner, true);
        this.texFmt = new TexFmt(true);

        this.inputEditor = this.createInputEditor();
        this.outputView = document.getElementById('output-display')!;

        this.setupEventListeners();
        this.initializeTools();
    }

    private createInputEditor(): EditorView {
        const state = EditorState.create({
            doc: sampleLatex,
            extensions: [
                lineNumbers(),
                highlightActiveLine(),
                syntaxHighlighting(defaultHighlightStyle),
                keymap.of(defaultKeymap),
                EditorView.lineWrapping
            ]
        });

        return new EditorView({
            state,
            parent: document.getElementById('input-editor')!
        });
    }

    private setupEventListeners(): void {
        document.querySelectorAll('input[name="tool"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentTool = target.value as 'texcount' | 'texfmt';
                this.updateToolOptions();
            });
        });

        document.getElementById('run-tool')!.addEventListener('click', () => {
            this.runCurrentTool();
        });

        document.getElementById('clear-output')!.addEventListener('click', () => {
            this.clearOutput();
        });
    }

    private updateToolOptions(): void {
        // const latexindentOptions = document.getElementById('latexindent-options')!;
        const texcountOptions = document.getElementById('texcount-options')!;
        const texfmtOptions = document.getElementById('texfmt-options')!;

        // latexindentOptions.style.display = this.currentTool === 'latexindent' ? 'block' : 'none';
        texcountOptions.style.display = this.currentTool === 'texcount' ? 'block' : 'none';
        texfmtOptions.style.display = this.currentTool === 'texfmt' ? 'block' : 'none';
    }

    private async initializeTools(): Promise<void> {
        this.setStatus('Initializing WebPerl...', 'info');

        try {
            await this.runner.initialize();
            this.setStatus('WebPerl initialized successfully', 'success');
        } catch (error) {
            this.setStatus(`Initialization failed: ${error}`, 'error');
        }
    }

    private async runCurrentTool(): Promise<void> {
        const input = this.inputEditor.state.doc.toString();

        if (!input.trim()) {
            this.setStatus('Please provide input', 'warning');
            return;
        }

        this.setStatus(`Running ${this.currentTool}...`, 'info');

        try {
            if (this.currentTool === 'texcount') {
                await this.runTexCount(input);
            } else {
                await this.runTexFmt(input);
            }
        } catch (error) {
            this.setStatus(`Error: ${error}`, 'error');
            this.displayOutput(`Error: ${error}`, true);
        }
    }

    private async runTexCount(input: string): Promise<void> {
        const options: TexCountOptions = {
            input,
            brief: (document.getElementById('brief') as HTMLInputElement).checked,
            total: (document.getElementById('total') as HTMLInputElement).checked,
            sum: (document.getElementById('sum') as HTMLInputElement).checked,
            verbose: parseInt((document.getElementById('verbose') as HTMLInputElement).value, 10)
        };

        const result = await this.texCount.count(options);

        if (result.success) {
            const parsed = this.texCount.parseOutput(result.output);
            this.displayCountResult(parsed);
            this.setStatus('Counting completed', 'success');
        } else {
            this.displayOutput(result.error || 'Unknown error', true);
            this.setStatus('Counting failed', 'error');
        }
    }

    private async runTexFmt(input: string): Promise<void> {
        const options: TexFmtOptions = {
            input,
            wrap: (document.getElementById('wrap') as HTMLInputElement).checked,
            wraplen: parseInt((document.getElementById('wraplen') as HTMLInputElement).value, 10),
            tabsize: parseInt((document.getElementById('tabsize-fmt') as HTMLInputElement).value, 10),
            usetabs: (document.getElementById('usetabs') as HTMLInputElement).checked
        };

        const result = await this.texFmt.format(options);

        if (result.success) {
            this.displayOutput(result.output, false);
            this.setStatus('Formatting completed', 'success');
        } else {
            this.displayOutput(result.error || 'Unknown error', true);
            this.setStatus('Formatting failed', 'error');
        }
    }

    private displayOutput(text: string, isError: boolean = false): void {
        this.outputView.innerHTML = '';
        const pre = document.createElement('pre');
        pre.className = isError ? 'error-output' : 'normal-output';
        pre.textContent = text;
        this.outputView.appendChild(pre);
    }

    private displayCountResult(result: any): void {
        this.outputView.innerHTML = '';

        const resultDiv = document.createElement('div');
        resultDiv.className = 'count-result';
        resultDiv.innerHTML = `
      <div class="count-item"><strong>Words in text:</strong> ${result.words}</div>
      <div class="count-item"><strong>Words in headers:</strong> ${result.headers}</div>
      <div class="count-item"><strong>Words in captions:</strong> ${result.captions}</div>
      <details class="raw-output">
        <summary>Raw Output</summary>
        <pre>${result.raw}</pre>
      </details>
    `;

        this.outputView.appendChild(resultDiv);
    }

    private clearOutput(): void {
        this.outputView.innerHTML = '';
        this.setStatus('Output cleared', 'info');
    }

    private setStatus(message: string, type: 'info' | 'success' | 'error' | 'warning'): void {
        const statusEl = document.getElementById('status')!;
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LatexToolsDemo();
});