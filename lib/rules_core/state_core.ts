// Core state object
//

import Token = require('../token');
import MarkdownIt = require("../../types");

class StateCore {
  env: any;
  level?: number;
  inlineMode: boolean;

  /** Link to parser instance */
  md: MarkdownIt;

  /** The markdown source code that is being parsed. */
  src: string;

  tokens: Token[];
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
