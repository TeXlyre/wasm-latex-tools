import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

import {
    WebPerlRunner,
    TexCount,
    TexFmt,
    LatexDiff,
    TexCountOptions,
    TexFmtOptions,
    LatexDiffOptions
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

const multiFileSample = `\\documentclass{article}
\\usepackage{amsmath}

\\title{Multi-File Document Example}
\\author{Demo Author}

\\begin{document}

\\maketitle

\\input{introduction.tex}

\\input{methods.tex}

\\section{Results}
The results are shown in the following sections.

\\input{results.tex}

\\section{Conclusion}
This demonstrates multi-file word counting.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;

interface FileTab {
    name: string;
    content: string;
    isMain: boolean;
}

class LatexToolsDemo {
    private inputEditor: EditorView;
    private outputView: HTMLElement;
    private runner: WebPerlRunner;
    private texCount: TexCount;
    private texFmt: TexFmt;
    private latexDiff: LatexDiff;
    private currentTool: 'texcount' | 'texfmt' | 'latexdiff' = 'texfmt';
    private oldContent: string = '';
    private files: Map<string, FileTab> = new Map();
    private activeFile: string = 'main.tex';

    constructor() {
        this.runner = new WebPerlRunner({
            webperlBasePath: '/webperl',
            perlScriptsPath: '/perl',
            verbose: true
        });

        this.texCount = new TexCount(this.runner, true);
        this.texFmt = new TexFmt(true);
        this.latexDiff = new LatexDiff(this.runner, true);

        this.files.set('main.tex', {
            name: 'main.tex',
            content: sampleLatex,
            isMain: true
        });

        this.inputEditor = this.createInputEditor();
        this.outputView = document.getElementById('output-display')!;

        this.setupEventListeners();
        this.initializeTools();
        this.renderFileTabs();
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
                this.currentTool = target.value as 'texcount' | 'texfmt' | 'latexdiff';
                this.updateToolOptions();
            });
        });

        document.getElementById('run-tool')!.addEventListener('click', () => {
            this.runCurrentTool();
        });

        document.getElementById('clear-output')!.addEventListener('click', () => {
            this.clearOutput();
        });

        document.getElementById('load-multifile-example')!.addEventListener('click', () => {
            this.loadMultiFileExample();
        });

        document.getElementById('add-file-btn')!.addEventListener('click', () => {
            this.addNewFile();
        });
    }

    private renderFileTabs(): void {
        const tabsContainer = document.getElementById('file-tabs')!;
        tabsContainer.innerHTML = '';

        this.files.forEach((file, filename) => {
            const tab = document.createElement('div');
            tab.className = `file-tab ${filename === this.activeFile ? 'active' : ''}`;

            const tabName = document.createElement('span');
            tabName.textContent = filename;
            tabName.addEventListener('click', () => this.switchToFile(filename));
            tab.appendChild(tabName);

            if (!file.isMain) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-tab';
                closeBtn.textContent = '×';
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFile(filename);
                });
                tab.appendChild(closeBtn);
            }

            tabsContainer.appendChild(tab);
        });
    }

    private switchToFile(filename: string): void {
        this.saveCurrentFile();
        this.activeFile = filename;
        const file = this.files.get(filename);
        if (file) {
            this.inputEditor.dispatch({
                changes: {
                    from: 0,
                    to: this.inputEditor.state.doc.length,
                    insert: file.content
                }
            });
        }
        this.renderFileTabs();
    }

    private saveCurrentFile(): void {
        const currentContent = this.inputEditor.state.doc.toString();
        const file = this.files.get(this.activeFile);
        if (file) {
            file.content = currentContent;
        }
    }

    private addNewFile(): void {
        const filename = prompt('Enter filename (e.g., chapter1.tex):');
        if (!filename) return;

        const normalizedName = filename.endsWith('.tex') || filename.endsWith('.bib')
            ? filename
            : filename + '.tex';

        if (this.files.has(normalizedName)) {
            alert('File already exists!');
            return;
        }

        this.saveCurrentFile();
        this.files.set(normalizedName, {
            name: normalizedName,
            content: '',
            isMain: false
        });
        this.activeFile = normalizedName;
        this.inputEditor.dispatch({
            changes: {
                from: 0,
                to: this.inputEditor.state.doc.length,
                insert: ''
            }
        });
        this.renderFileTabs();
        this.setStatus(`Created new file: ${normalizedName}`, 'success');
    }

    private removeFile(filename: string): void {
        if (this.files.get(filename)?.isMain) return;

        this.files.delete(filename);
        if (this.activeFile === filename) {
            this.activeFile = 'main.tex';
            const mainFile = this.files.get('main.tex');
            if (mainFile) {
                this.inputEditor.dispatch({
                    changes: {
                        from: 0,
                        to: this.inputEditor.state.doc.length,
                        insert: mainFile.content
                    }
                });
            }
        }
        this.renderFileTabs();
        this.setStatus(`Removed file: ${filename}`, 'info');
    }

    private loadMultiFileExample(): void {
        this.files.clear();

        this.files.set('main.tex', {
            name: 'main.tex',
            content: multiFileSample,
            isMain: true
        });

        this.files.set('introduction.tex', {
            name: 'introduction.tex',
            content: `\\section{Introduction}
LaTeX is a document preparation system for high-quality typesetting.
It is most often used for medium-to-large technical or scientific documents.

\\subsection{Background}
This section provides background information about the topic.
The content here demonstrates how included files are counted separately.`,
            isMain: false
        });

        this.files.set('methods.tex', {
            name: 'methods.tex',
            content: `\\section{Methods}
This section describes the methodology used in the research.

\\subsection{Experimental Setup}
We designed a controlled experiment with the following parameters.
Multiple measurements were taken to ensure accuracy.

\\subsection{Data Collection}
Data was collected over a period of six months using automated tools.`,
            isMain: false
        });

        this.files.set('results.tex', {
            name: 'results.tex',
            content: `\\subsection{Statistical Analysis}
The results show a significant correlation between variables.
Table 1 summarizes the key findings from our analysis.

\\subsection{Discussion}
These findings suggest that the hypothesis is supported by the data.
Further research is needed to validate these results.`,
            isMain: false
        });

        this.files.set('references.bib', {
            name: 'references.bib',
            content: `@article{sample2023,
  title={Sample Article Title},
  author={Author, John and Writer, Jane},
  journal={Journal of Examples},
  volume={42},
  pages={123--145},
  year={2023}
}

@book{example2022,
  title={Example Book on Documentation},
  author={Editor, Alice},
  publisher={Academic Press},
  year={2022}
}`,
            isMain: false
        });

        this.activeFile = 'main.tex';
        this.inputEditor.dispatch({
            changes: {
                from: 0,
                to: this.inputEditor.state.doc.length,
                insert: multiFileSample
            }
        });

        this.renderFileTabs();
        (document.getElementById('include-files') as HTMLInputElement).checked = true;
        (document.getElementById('merge') as HTMLInputElement).checked = false;
        this.setStatus('Multi-file example loaded. Switch tabs to view different files.', 'success');
    }

    private updateToolOptions(): void {
        const texcountOptions = document.getElementById('texcount-options')!;
        const texfmtOptions = document.getElementById('texfmt-options')!;
        const latexdiffOptions = document.getElementById('latexdiff-options')!;

        texcountOptions.style.display = this.currentTool === 'texcount' ? 'block' : 'none';
        texfmtOptions.style.display = this.currentTool === 'texfmt' ? 'block' : 'none';
        latexdiffOptions.style.display = this.currentTool === 'latexdiff' ? 'block' : 'none';
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
        this.saveCurrentFile();
        const mainFile = this.files.get('main.tex');

        if (!mainFile || !mainFile.content.trim()) {
            this.setStatus('Please provide input in main.tex', 'warning');
            return;
        }

        this.setStatus(`Running ${this.currentTool}...`, 'info');

        try {
            if (this.currentTool === 'texcount') {
                await this.runTexCount(mainFile.content);
            } else if (this.currentTool === 'latexdiff') {
                await this.runLatexDiff(mainFile.content);
            } else {
                await this.runTexFmt(mainFile.content);
            }
        } catch (error) {
            this.setStatus(`Error: ${error}`, 'error');
            this.displayOutput(`Error: ${error}`, true);
        }
    }

    private async runTexCount(input: string): Promise<void> {
        const includeFiles = (document.getElementById('include-files') as HTMLInputElement).checked;
        const merge = (document.getElementById('merge') as HTMLInputElement).checked;

        const options: TexCountOptions = {
            input,
            brief: (document.getElementById('brief') as HTMLInputElement).checked,
            total: (document.getElementById('total') as HTMLInputElement).checked,
            sum: (document.getElementById('sum') as HTMLInputElement).checked,
            verbose: parseInt((document.getElementById('verbose') as HTMLInputElement).value, 10),
            includeFiles,
            merge
        };

        if (includeFiles) {
            const additionalFiles = this.extractIncludedFiles(input);
            if (additionalFiles.length > 0) {
                options.additionalFiles = additionalFiles;
                const fileList = additionalFiles.map(f => f.path).join(', ');
                this.setStatus(`Counting with ${additionalFiles.length} included file(s): ${fileList}`, 'info');
            }
        }

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

    private extractIncludedFiles(content: string): { path: string; content: string }[] {
        const includePattern = /\\(?:input|include)\{([^}]+)\}/g;
        const bibPattern = /\\bibliography\{([^}]+)\}/g;
        const files: { path: string; content: string }[] = [];
        let match;

        while ((match = includePattern.exec(content)) !== null) {
            let filename = match[1];
            if (!filename.endsWith('.tex')) {
                filename += '.tex';
            }

            const file = this.files.get(filename);
            if (file) {
                files.push({ path: filename, content: file.content });
            }
        }

        while ((match = bibPattern.exec(content)) !== null) {
            let filename = match[1];
            if (!filename.endsWith('.bib')) {
                filename += '.bib';
            }

            const file = this.files.get(filename);
            if (file) {
                files.push({ path: filename, content: file.content });
            }
        }

        return files;
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

    private async runLatexDiff(input: string): Promise<void> {
        if (!this.oldContent) {
            this.oldContent = input;
            this.setStatus('Saved current version as "old". Make changes and run again to see diff.', 'success');
            return;
        }

        const options: LatexDiffOptions = {
            input,
            oldContent: this.oldContent,
            type: (document.getElementById('diff-type') as HTMLSelectElement).value as any
        };

        const result = await this.latexDiff.diff(this.oldContent, input, options);

        if (result.success) {
            this.displayOutput(result.output, false);
            this.setStatus('Diff completed. Click "Clear Output" to reset for new comparison.', 'success');
        } else {
            this.displayOutput(result.error || 'Unknown error', true);
            this.setStatus('Diff failed', 'error');
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
        if (this.currentTool === 'latexdiff') {
            this.oldContent = '';
            this.setStatus('Output cleared. Old content reset.', 'info');
        } else {
            this.setStatus('Output cleared', 'info');
        }
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