import { BaseTool } from './base-tool';
import { LatexIndentOptions, ScriptResult, ScriptRunOptions } from '../core/types';

export class LatexIndent extends BaseTool {
    getScriptPath(): string {
        return '/latexindent.pl';
    }

    getDependencyPaths(): string[] {
        return [
            '/File/Which.pm',
            '/File/HomeDir.pm',
            '/File/HomeDir/Driver.pm',
            '/File/HomeDir/Unix.pm',
            '/YAML/Tiny.pm',
            '/LatexIndent/AlignmentAtAmpersand.pm',
            '/LatexIndent/Arguments.pm',
            '/LatexIndent/BackUpFileProcedure.pm',
            '/LatexIndent/BlankLines.pm',
            '/LatexIndent/Braces.pm',
            '/LatexIndent/Check.pm',
            '/LatexIndent/Command.pm',
            '/LatexIndent/Document.pm',
            '/LatexIndent/DoubleBackSlash.pm',
            '/LatexIndent/Else.pm',
            '/LatexIndent/Environment.pm',
            '/LatexIndent/FileContents.pm',
            '/LatexIndent/FileExtension.pm',
            '/LatexIndent/GetYamlSettings.pm',
            '/LatexIndent/Heading.pm',
            '/LatexIndent/HiddenChildren.pm',
            '/LatexIndent/HorizontalWhiteSpace.pm',
            '/LatexIndent/IfElseFi.pm',
            '/LatexIndent/Indent.pm',
            '/LatexIndent/Item.pm',
            '/LatexIndent/KeyEqualsValuesBraces.pm',
            '/LatexIndent/Lines.pm',
            '/LatexIndent/LogFile.pm',
            '/LatexIndent/Logger.pm',
            '/LatexIndent/MandatoryArgument.pm',
            '/LatexIndent/ModifyLineBreaks.pm',
            '/LatexIndent/NamedGroupingBracesBrackets.pm',
            '/LatexIndent/OptionalArgument.pm',
            '/LatexIndent/Preamble.pm',
            '/LatexIndent/Replacement.pm',
            '/LatexIndent/RoundBrackets.pm',
            '/LatexIndent/Sentence.pm',
            '/LatexIndent/Special.pm',
            '/LatexIndent/Switches.pm',
            '/LatexIndent/Tokens.pm',
            '/LatexIndent/TrailingComments.pm',
            '/LatexIndent/UnNamedGroupingBracesBrackets.pm',
            '/LatexIndent/UTF8CmdLineArgsFileOperation.pm',
            '/LatexIndent/Verbatim.pm',
            '/LatexIndent/Version.pm',
            '/LatexIndent/Wrap.pm'
        ];
    }

    async format(options: LatexIndentOptions): Promise<ScriptResult> {
        return this.executeScript(options);
    }

    protected buildArguments(
        inputPath: string,
        outputPath: string,
        options: ScriptRunOptions
    ): string[] {
        const latexOptions = options as LatexIndentOptions;
        const scriptPath = this.getScriptPath();

        const args = [scriptPath, inputPath, '-o', outputPath];

        if (latexOptions.silent) args.push('-s');
        if (latexOptions.localSettings) args.push('-l', latexOptions.localSettings);
        if (latexOptions.args) args.push(...latexOptions.args);

        return args;
    }
}
