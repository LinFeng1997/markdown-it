'use strict';
import State = require('../../types/rules_core/state_code');
import Token = require('../../types/token');

export = function inline(state: State) {
  let tokens: Token[] = state.tokens, tok;

  // Parse inlines
  for (let i = 0, l: number = tokens.length; i < l; i++) {
    tok = tokens[i];
    if (tok.type === 'inline') {
      state.md.inline.parse(tok.content, state.md, state.env, tok.children);
    }
  }
};
