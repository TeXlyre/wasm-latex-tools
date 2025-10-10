import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

import {
    WebPerlRunner,
    TexCount,
    TexFmt,
    LatexDiff,
    Latexpand,
    TexCountOptions,
    TexFmtOptions,
    LatexDiffOptions,
    LatexpandOptions
} from '../../../src';

import {
    sampleLatex,
    multiFileSample,
    introductionSample,
    methodsSample,
    resultsSample,
    referencesSample
} from './samples';

import './styles.css';

interface FileTab {
    name: string;
    content: string;
    isMain: boolean;
}

const basePath = document.querySelector('base')?.getAttribute('href') || '';

class LatexToolsDemo {
    private inputEditor: EditorView;
    private outputView: HTMLElement;
    private runner: WebPerlRunner;
    private texCount: TexCount;
    private texFmt: TexFmt;
    private latexDiff: LatexDiff;
    private latexpand: Latexpand;
    private currentTool: 'texcount' | 'texfmt' | 'latexdiff' | 'latexpand' = 'texfmt';
    private files: Map<string, FileTab> = new Map();
    private activeFile: string = 'main.tex';

    constructor() {
        this.runner = new WebPerlRunner({
            webperlBasePath: `${basePath}core/webperl`,
            perlScriptsPath: `${basePath}core/perl`,
            verbose: true
        });

        this.texCount = new TexCount(this.runner, true);
        this.texFmt = new TexFmt(true, `${basePath}core/texfmt`);
        this.latexDiff = new LatexDiff(this.runner, true);
        this.latexpand = new Latexpand(this.runner, true);

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
                this.currentTool = target.value as 'texcount' | 'texfmt' | 'latexdiff' | 'latexpand';
                this.updateToolOptions();
            });
        });

        document.getElementById('run-tool')!.addEventListener('click', () => {
            this.runCurrentTool();
        });

        document.getElementById('clear-output')!.addEventListener('click', () => {
            this.clearOutput();
        });

        document.querySelectorAll('.load-multifile-example').forEach(button => {
            button.addEventListener('click', () => {
                this.loadMultiFileExample();
            });
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

        if (this.currentTool === 'latexdiff') {
            this.updateDiffFileSelectors();
        } else if (this.currentTool === 'texfmt') {
            this.updateFmtFileSelector();
        } else if (this.currentTool === 'texcount') {
            this.updateCountFileSelector();
        } else if (this.currentTool === 'latexpand') {
            this.updateExpandFileSelector();
        }
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
            content: introductionSample,
            isMain: false
        });

        this.files.set('methods.tex', {
            name: 'methods.tex',
            content: methodsSample,
            isMain: false
        });

        this.files.set('results.tex', {
            name: 'results.tex',
            content: resultsSample,
            isMain: false
        });

        this.files.set('references.bib', {
            name: 'references.bib',
            content: referencesSample,
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
        const latexpandOptions = document.getElementById('latexpand-options')!;

        texcountOptions.style.display = this.currentTool === 'texcount' ? 'block' : 'none';
        texfmtOptions.style.display = this.currentTool === 'texfmt' ? 'block' : 'none';
        latexdiffOptions.style.display = this.currentTool === 'latexdiff' ? 'block' : 'none';
        latexpandOptions.style.display = this.currentTool === 'latexpand' ? 'block' : 'none';

        if (this.currentTool === 'latexdiff') {
            this.updateDiffFileSelectors();
        } else if (this.currentTool === 'texfmt') {
            this.updateFmtFileSelector();
        } else if (this.currentTool === 'texcount') {
            this.updateCountFileSelector();
        } else if (this.currentTool === 'latexpand') {
            this.updateExpandFileSelector();
        }
    }

    private updateDiffFileSelectors(): void {
        const oldFileSelect = document.getElementById('diff-old-file') as HTMLSelectElement;
        const newFileSelect = document.getElementById('diff-new-file') as HTMLSelectElement;

        oldFileSelect.innerHTML = '';
        newFileSelect.innerHTML = '';

        this.files.forEach((file, filename) => {
            const optionOld = document.createElement('option');
            optionOld.value = filename;
            optionOld.textContent = filename;
            oldFileSelect.appendChild(optionOld);

            const optionNew = document.createElement('option');
            optionNew.value = filename;
            optionNew.textContent = filename;
            newFileSelect.appendChild(optionNew);
        });

        if (this.files.size > 1) {
            const fileNames = Array.from(this.files.keys());
            newFileSelect.value = fileNames[fileNames.length - 1];
        }
    }

    private updateFmtFileSelector(): void {
        const fmtFileSelect = document.getElementById('fmt-file') as HTMLSelectElement;
        fmtFileSelect.innerHTML = '';

        this.files.forEach((file, filename) => {
            const option = document.createElement('option');
            option.value = filename;
            option.textContent = filename;
            fmtFileSelect.appendChild(option);
        });

        fmtFileSelect.value = this.activeFile;
    }

    private updateCountFileSelector(): void {
        const countFileSelect = document.getElementById('count-file') as HTMLSelectElement;
        countFileSelect.innerHTML = '';

        this.files.forEach((file, filename) => {
            const option = document.createElement('option');
            option.value = filename;
            option.textContent = filename;
            countFileSelect.appendChild(option);
        });

        countFileSelect.value = 'main.tex';
    }

    private updateExpandFileSelector(): void {
        const expandFileSelect = document.getElementById('expand-file') as HTMLSelectElement;
        expandFileSelect.innerHTML = '';

        this.files.forEach((file, filename) => {
            const option = document.createElement('option');
            option.value = filename;
            option.textContent = filename;
            expandFileSelect.appendChild(option);
        });

        expandFileSelect.value = 'main.tex';
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

        this.setStatus(`Running ${this.currentTool}...`, 'info');

        try {
            if (this.currentTool === 'texcount') {
                await this.runTexCount('');
            } else if (this.currentTool === 'latexdiff') {
                await this.runLatexDiff('');
            } else if (this.currentTool === 'latexpand') {
                await this.runLatexpand('');
            } else {
                await this.runTexFmt('');
            }
        } catch (error) {
            this.setStatus(`Error: ${error}`, 'error');
            this.displayOutput(`Error: ${error}`, true);
        }
    }

    private async runTexCount(input: string): Promise<void> {
        const countFileSelect = document.getElementById('count-file') as HTMLSelectElement;
        const selectedFilename = countFileSelect.value;
        const selectedFile = this.files.get(selectedFilename);

        if (!selectedFile || !selectedFile.content.trim()) {
            this.setStatus('Please select a valid file', 'warning');
            return;
        }

        const includeFiles = (document.getElementById('include-files') as HTMLInputElement).checked;
        const merge = (document.getElementById('merge') as HTMLInputElement).checked;

        const options: TexCountOptions = {
            input: selectedFile.content,
            brief: (document.getElementById('brief') as HTMLInputElement).checked,
            total: (document.getElementById('total') as HTMLInputElement).checked,
            sum: (document.getElementById('sum') as HTMLInputElement).checked,
            verbose: parseInt((document.getElementById('verbose') as HTMLInputElement).value, 10),
            includeFiles,
            merge
        };

        if (includeFiles) {
            const additionalFiles = this.extractIncludedFiles(selectedFile.content);
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
        const fmtFileSelect = document.getElementById('fmt-file') as HTMLSelectElement;
        const selectedFilename = fmtFileSelect.value;
        const selectedFile = this.files.get(selectedFilename);

        if (!selectedFile || !selectedFile.content.trim()) {
            this.setStatus('Please select a valid file', 'warning');
            return;
        }

        const options: TexFmtOptions = {
            input: selectedFile.content,
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
        const oldFileSelect = document.getElementById('diff-old-file') as HTMLSelectElement;
        const newFileSelect = document.getElementById('diff-new-file') as HTMLSelectElement;

        const oldFilename = oldFileSelect.value;
        const newFilename = newFileSelect.value;

        const oldFile = this.files.get(oldFilename);
        const newFile = this.files.get(newFilename);

        if (!oldFile || !newFile) {
            this.setStatus('Please select valid old and new files', 'error');
            return;
        }

        if (oldFilename === newFilename) {
            this.setStatus('Please select different files for comparison', 'warning');
            return;
        }

        const options: LatexDiffOptions = {
            input: newFile.content,
            oldContent: oldFile.content,
            type: (document.getElementById('diff-type') as HTMLSelectElement).value as any
        };

        const result = await this.latexDiff.diff(oldFile.content, newFile.content, options);

        if (result.success) {
            this.displayOutput(result.output, false);
            this.setStatus(`Diff completed: ${oldFilename} → ${newFilename}`, 'success');
        } else {
            this.displayOutput(result.error || 'Unknown error', true);
            this.setStatus('Diff failed', 'error');
        }
    }

    private async runLatexpand(input: string): Promise<void> {
        const expandFileSelect = document.getElementById('expand-file') as HTMLSelectElement;
        const selectedFilename = expandFileSelect.value;
        const selectedFile = this.files.get(selectedFilename);

        if (!selectedFile || !selectedFile.content.trim()) {
            this.setStatus('Please select a valid file', 'warning');
            return;
        }

        const options: LatexpandOptions = {
            input: selectedFile.content,
            keepComments: (document.getElementById('keep-comments') as HTMLInputElement).checked,
            emptyComments: (document.getElementById('empty-comments') as HTMLInputElement).checked,
            expandUsepackage: (document.getElementById('expand-usepackage') as HTMLInputElement).checked,
            makeatletter: (document.getElementById('makeatletter') as HTMLInputElement).checked,
            showGraphics: (document.getElementById('show-graphics') as HTMLInputElement).checked,
            fatal: (document.getElementById('fatal') as HTMLInputElement).checked
        };

        const additionalFiles = this.extractIncludedFiles(selectedFile.content);
        if (additionalFiles.length > 0) {
            options.additionalFiles = additionalFiles;
            const fileList = additionalFiles.map(f => f.path).join(', ');
            this.setStatus(`Expanding with ${additionalFiles.length} included file(s): ${fileList}`, 'info');
        }

        console.log('Latexpand options:', options);
        console.log('Additional files:', additionalFiles);

        const result = await this.latexpand.expand(options);

        console.log('Latexpand result:', result);

        if (result.success) {
            if (result.output && result.output.trim()) {
                this.displayOutput(result.output, false);
                this.setStatus('Expansion completed', 'success');
            } else {
                this.displayOutput('Warning: Expansion completed but produced no output.\n\n' + (result.error || ''), true);
                this.setStatus('Expansion completed with warnings', 'warning');
            }
        } else {
            this.displayOutput(result.error || 'Unknown error', true);
            this.setStatus('Expansion failed', 'error');
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