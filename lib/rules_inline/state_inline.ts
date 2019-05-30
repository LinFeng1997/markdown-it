// Inline parser state


import State = require('../rules_core/state_core');
import MarkdownIt = require("../../types");
import Token = require("../token");

const isWhiteSpace   = require('../common/utils').isWhiteSpace;
const isPunctChar    = require('../common/utils').isPunctChar;
const isMdAsciiPunct = require('../common/utils').isMdAsciiPunct;


class StateInline extends State {
  /**
   * Stores `{ start: end }` pairs. Useful for backtrack
   * optimization of pairs parse (emphasis, strikes).
   */
  cache: { [start: number]: number };

  /** Emphasis-like delimiters */
  delimiters: MarkdownIt.Delimiter[];

  pending: string;
  pendingLevel: number;

  /** Index of the first character of this token. */
  pos: number;

  /** Index of the last character that can be used (for example the one before the end of this line). */
  posMax: number;

  level: number;

  constructor(src:string, md:MarkdownIt, env:any, outTokens:Token[]){
    super(src, md, env)
  this.src = src;
  this.env = env;
  this.md = md;
  this.tokens = outTokens;

  this.pos = 0;
  this.posMax = this.src.length;
  this.level = 0;
  this.pending = '';
  this.pendingLevel = 0;

  this.cache = {};        // Stores { start: end } pairs. Useful for backtrack
                          // optimization of pairs parse (emphasis, strikes).

  this.delimiters = [];   // Emphasis-like delimiters
  }

  // Flush pending text
  pushPending ():Token {
    const token = new Token('text', '', 0);
    token.content = this.pending;
    token.level = this.pendingLevel;
    this.tokens.push(token);
    this.pending = '';
    return token;
  };

  // Push new token to "stream".
  // If pending text exists - flush it as text token
  push(type: string, tag: string, nesting: number): Token {
    if (this.pending) {
      this.pushPending();
    }

    let token = new Token(type, tag, nesting);

    if (nesting < 0) {
      this.level--;
    }
    token.level = this.level;
    if (nesting > 0) {
      this.level++;
    }

    this.pendingLevel = this.level;
    this.tokens.push(token);
    return token;
  };

  // Scan a sequence of emphasis-like markers, and determine whether
// it can start an emphasis sequence or end an emphasis sequence.
//
//  - start - position to scan from (it should point at a valid marker);
//  - canSplitWord - determine if these markers can be found inside a word
//
  scanDelims(start: number, canSplitWord: boolean): {
    can_open: boolean | number,
    can_close: boolean | string,
    length: number
  } {
    let pos = start,
      lastChar: number,
      nextChar: number,
      count: number,
      can_open: boolean | number,
      can_close: boolean | string,

      isLastWhiteSpace: number,
      isLastPunctChar: number,

      isNextWhiteSpace: number,
      isNextPunctChar: string,
      left_flanking = true,

      right_flanking = true,
      max = this.posMax,
      marker = this.src.charCodeAt(start);

    // treat beginning of the line as a whitespace
    lastChar = start > 0 ? this.src.charCodeAt(start - 1) : 0x20;

    const isCommonPunctChar = char => isMdAsciiPunct(char) || isPunctChar(String.fromCharCode(char));
    const getFlanking = (isWhiteSpace,isPunctChar,rightLast) => {
      if (isWhiteSpace) {
        return false
      } else if (isPunctChar) {
        if (!rightLast) {
          return false;
        }
      }
      return true;
    }

    while (pos < max && this.src.charCodeAt(pos) === marker) { pos++; }

    count = pos - start;

    // treat end of the line as a whitespace
    nextChar = pos < max ? this.src.charCodeAt(pos) : 0x20;

    isLastPunctChar = isCommonPunctChar(lastChar)
    isNextPunctChar = isCommonPunctChar(nextChar)

    isLastWhiteSpace = isWhiteSpace(lastChar);
    isNextWhiteSpace = isWhiteSpace(nextChar);

    left_flanking = getFlanking(isNextWhiteSpace,isNextPunctChar,isLastWhiteSpace || isLastPunctChar);
    right_flanking = getFlanking(isLastWhiteSpace,isLastPunctChar,isNextWhiteSpace || isNextPunctChar);

    if (!canSplitWord) {
      can_open  = left_flanking  && (!right_flanking || isLastPunctChar);
      can_close = right_flanking && (!left_flanking  || isNextPunctChar);
    } else {
      can_open  = left_flanking;
      can_close = right_flanking;
    }

    return {
      can_open:  can_open,
      can_close: can_close,
      length:    count
    };
  };

// re-export Token class to use in block rules
  Token = Token
}


export default StateInline;
module.exports = StateInline;
