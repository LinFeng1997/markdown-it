// Parser state class



import MarkdownIt = require('../../types');
import TokenType from '../../types/token';
import State = require('../rules_core/state_core');

var Token = require('../token');
var isSpace = require('../common/utils').isSpace;

class StateBlock extends State{
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

  level: number;
  result: string;

  // skipChars(pos: number, marker: number): number
  // skipSpaces(pos: number): number
  // getLines(begin: number, end: number, indent: number, keepLastLF: boolean): string
  // push(type: string, tag: string, nesting: number): Token

  constructor(src: string, md: MarkdownIt, env: any, tokens) {
    super(src, md, env);

    this.src = src;

    // link to parser instance
    this.md = md;

    this.env = env;

    //
    // Internal state vartiables
    //

    this.tokens = tokens;
    this.bMarks = [];  // line begin offsets for fast jumps
    this.eMarks = [];  // line end offsets for fast jumps
    this.tShift = [];  // offsets of the first non-space characters (tabs not expanded)
    this.sCount = [];  // indents for each line (tabs expanded)

    // An amount of virtual spaces (tabs expanded) between beginning
    // of each line (bMarks) and real beginning of that line.
    //
    // It exists only as a hack because blockquotes override bMarks
    // losing information in the process.
    //
    // It's used only when expanding tabs, you can think about it as
    // an initial tab length, e.g. bsCount=21 applied to string `\t123`
    // means first tab should be expanded to 4-21%4 === 3 spaces.
    //
    this.bsCount = [];

    // block parser variables
    this.blkIndent = 0; // required block content indent
    // (for example, if we are in list)
    this.line = 0; // line index in src
    this.lineMax = 0; // lines count
    this.tight = false;  // loose/tight mode for lists
    this.ddIndent = -1; // indent of the current dd block (-1 if there isn't any)

    // can be 'blockquote', 'list', 'root', 'paragraph' or 'reference'
    // used in lists to determine if they interrupt a paragraph
    this.parentType = 'root';

    this.level = 0;

    // renderer
    this.result = '';

    // Create caches
    // Generate markers.
    this.scan();

    // Push fake entry to simplify cache bounds checks
    this.bMarks.push(this.src.length);
    this.eMarks.push(this.src.length);
    this.tShift.push(0);
    this.sCount.push(0);
    this.bsCount.push(0);

    this.lineMax = this.bMarks.length - 1; // don't count last fake line
  }

  private scan() {
    let indent_found = false,
        ch: number,
        start: number,
        pos: number,
        len: number,
        indent: number,
        offset: number;
    for (start = pos = indent = offset = 0, len = this.src.length; pos < len; pos++) {
      ch = this.src.charCodeAt(pos);

      if (!indent_found) {
        if (isSpace(ch)) {
          indent++;

          if (ch === 0x09) {
            offset += 4 - offset % 4;
          } else {
            offset++;
          }
          continue;
        } else {
          indent_found = true;
        }
      }

      if (ch === 0x0A || pos === len - 1) {
        if (ch !== 0x0A) {
          pos++;
        }
        this.bMarks.push(start);
        this.eMarks.push(pos);
        this.tShift.push(indent);
        this.sCount.push(offset);
        this.bsCount.push(0);

        indent_found = false;
        indent = 0;
        offset = 0;
        start = pos + 1;
      }
    }
  }

  // Push new token to "stream".
  push(type: string, tag: string, nesting: number): TokenType {
    var token: TokenType = new Token(type, tag, nesting);
    token.block = true;

    if (nesting < 0) {
      this.level--;
    }
    token.level = this.level;
    if (nesting > 0) {
      this.level++;
    }

    this.tokens.push(token);
    return token;
  }

  isEmpty(line: number): boolean {
    return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
  }


  skipEmptyLines(from: number): number {
    for (let max = this.lineMax; from < max; from++) {
      if (!this.isEmpty(from)) {
        break;
      }
    }
    return from;
  }


  private skipConditionChars = (pos: number, condition: (pos: number) => boolean): number => {
    for (let max: number = this.src.length; pos < max; pos++) {
      if (condition(pos)) {
        break;
      }
    }
    return pos;
  }
  private skipConditionCharsBack = (pos: number, min: number, condition: (pos: number) => boolean): number => {
    if (pos <= min) {
      return pos;
    }

    while (pos > min) {
      --pos;
      if (condition(pos)) {
        return pos + 1;
      }
    }
    return pos;
  }
  // Skip spaces from given position.
  skipSpaces(pos: number): number {
    const condition = (pos: number) => !isSpace(this.src.charCodeAt(pos));
    return this.skipConditionChars(pos, condition);
  }

  // Skip spaces from given position in reverse.
  skipSpacesBack(pos: number, min: number): number {
    const condition = (pos: number) => !isSpace(this.src.charCodeAt(pos));
    return this.skipConditionCharsBack(pos, min, condition);
  }

  // Skip char codes from given position
  skipChars(pos: number, code: number): number {
    const condition = (pos: number) => code !== this.src.charCodeAt(pos);
    return this.skipConditionChars(pos, condition);
  }

  // Skip char codes reverse from given position - 1
  skipCharsBack(pos: number, code: number, min: number): number {
    const condition = (pos: number) => code !== this.src.charCodeAt(pos);
    return this.skipConditionCharsBack(pos, min, condition);
  }

  // cut lines range from source.
  getLines(begin: number, end: number, indent: number, keepLastLF: boolean) {
    let i: number,
        lineIndent: number,
        ch: number,
        first: number,
        last: number,
        queue: string[],
        lineStart,
        line = begin;

    if (begin >= end) {
      return '';
    }

    queue = new Array(end - begin);

    for (i = 0; line < end; line++, i++) {
      lineIndent = 0;
      lineStart = first = this.bMarks[line];

      if (line + 1 < end || keepLastLF) {
        // No need for bounds check because we have fake entry on tail.
        last = this.eMarks[line] + 1;
      } else {
        last = this.eMarks[line];
      }

      while (first < last && lineIndent < indent) {
        ch = this.src.charCodeAt(first);

        if (isSpace(ch)) {
          if (ch === 0x09) {
            lineIndent += 4 - (lineIndent + this.bsCount[line]) % 4;
          } else {
            lineIndent++;
          }
        } else if (first - lineStart < this.tShift[line]) {
          // patched tShift masked characters to look like spaces (blockquotes, list markers)
          lineIndent++;
        } else {
          break;
        }

        first++;
      }

      if (lineIndent > indent) {
        // partially expanding tabs in code blocks, e.g '\t\tfoobar'
        // with indent=2 becomes '  \tfoobar'
        queue[i] = new Array(lineIndent - indent + 1).join(' ') + this.src.slice(first, last);
      } else {
        queue[i] = this.src.slice(first, last);
      }
    }

    return queue.join('');
  }

  // re-export Token class to use in block rules
  Token = Token
}

export default StateBlock;
module.exports = StateBlock;
