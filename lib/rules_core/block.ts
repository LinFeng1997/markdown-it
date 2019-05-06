'use strict';
import State = require('../../types/rules_core/state_code');
import Token from '../../types/token';

export = function block(state: State) {
  let token: Token;

  if (state.inlineMode) {
    token = new state.Token('inline', '', 0);
    token.content = state.src;
    token.map = [0, 1];
    token.children = [];
    state.tokens.push(token);
  } else {
    state.md.block.parse(state.src, state.md, state.env, state.tokens);
  }
};
