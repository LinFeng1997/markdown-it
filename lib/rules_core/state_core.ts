// Core state object
//
'use strict';
import TokenType from '../../types/token';
import MarkdownIt = require("../../types");
//
const Token = require('../token');

class StateCore {
  env: any;
  level?: number;
  inlineMode: boolean;

  /** Link to parser instance */
  md: MarkdownIt;

  /** The markdown source code that is being parsed. */
  src: string;

  tokens: TokenType[];
  constructor(src: string, md: MarkdownIt, env: any) {
    this.src = src;
    this.env = env;
    this.tokens = [];
    this.inlineMode = false;
    this.md = md; // link to parser instance
  }

  Token = Token
}
export = StateCore;
