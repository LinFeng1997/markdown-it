// Merge adjacent text nodes into one, and re-calculate all token levels
//

import StateInline from "./state_inline";

module.exports = function text_collapse(state: StateInline): void {
  let curr: number,
    last: number,
    tokens = state.tokens,
    max: number = state.tokens.length;

  function reCalLevels() {
    let level = 0;
    state.tokens.forEach(token => {
      level += token.nesting;
      token.level += level;
    })
  }

  function isTextToken(tokens,curr) {
    return tokens[curr].type === 'text' &&
        curr + 1 < max &&
        tokens[curr + 1].type === 'text';
  }

  function collapseText(){
    // collapse two adjacent text nodes
    tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
  }

  // re-calculate levels
  reCalLevels();

  for (curr = last = 0; curr < max; curr++) {
    if (isTextToken(tokens,curr)) {

      collapseText()
    } else {
      if (curr !== last) { tokens[last] = tokens[curr]; }

      last++;
    }
  }

  if (max > last) {
    tokens.length = last;
  }
};
