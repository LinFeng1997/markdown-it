import MarkdownIt = require("..");
import State from "../rules_core/state_core";
import Token from "../token";

export default class StateBlock extends State {
    /** Used in lists to determine if they interrupt a paragraph */
    parentType: 'blockquote' | 'list' | 'root' | 'paragraph' | 'reference';

    eMarks: number[];
    bMarks: number[];
    bsCount: number[];
    sCount: number[];
    tShift: number[];

    blkIndent: number;
    ddIndent: number;

    line: number;
    lineMax: number;
    tight: boolean;

    skipChars(pos: number, marker: number): number
    skipSpaces(pos: number): number
    getLines(begin: number, end: number, indent: number, keepLastLF: boolean): string
    push(type: string, tag: string, nesting: number): Token
}
