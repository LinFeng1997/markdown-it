// ~~strike through~~
//

import StateInline from "./state_inline";
import Token = require("../token");

// Insert each marker as a separate text token, and add it to delimiter list
//
module.exports.tokenize = function strikethrough(state: StateInline, silent: boolean): boolean  {
  let token: Token,
    start = state.pos,
    marker: number = state.src.charCodeAt(start);

  if (silent) { return false; }

  if (marker !== 0x7E/* ~ */) { return false; }

  let scanned = state.scanDelims(state.pos, true);
  let len = scanned.length;
  let ch = String.fromCharCode(marker);

  if (len < 2) { return false; }

  if (len % 2) {
    token         = state.push('text', '', 0);
    token.content = ch;
    len--;
  }

  for (let i = 0; i < len; i += 2) {
    token         = state.push('text', '', 0);
    token.content = ch + ch;

    state.delimiters.push({
      marker: marker,
      jump:   i,
      token:  state.tokens.length - 1,
      level:  state.level,
      end:    -1,
      open:   !!scanned.can_open,
      close:  !!scanned.can_close,
      length: scanned.length
    });
  }

  state.pos += scanned.length;

  return true;
};


// Walk through delimiter list and replace text tokens with tags
//
module.exports.postProcess = function strikethrough(state) {
  let token:Token,
      loneMarkers:number[] = [],
      max = state.delimiters.length;

  function swapToken(i,j) {
    token = state.tokens[j];
    state.tokens[j] = state.tokens[i];
    state.tokens[i] = token;
  }

  for (let i = 0; i < max; i++) {
    let startDelim = state.delimiters[i];

    if (startDelim.marker !== 0x7E/* ~ */) {
      continue;
    }

    if (startDelim.end === -1) {
      continue;
    }

    let endDelim = state.delimiters[startDelim.end];

    token         = state.tokens[startDelim.token];
    token.type    = 's_open';
    token.tag     = 's';
    token.nesting = 1;
    token.markup  = '~~';
    token.content = '';

    token         = state.tokens[endDelim.token];
    token.type    = 's_close';
    token.tag     = 's';
    token.nesting = -1;
    token.markup  = '~~';
    token.content = '';

    if (state.tokens[endDelim.token - 1].type === 'text' &&
        state.tokens[endDelim.token - 1].content === '~') {

      loneMarkers.push(endDelim.token - 1);
    }
  }

  // If a marker sequence has an odd number of characters, it's splitted
  // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
  // start of the sequence.
  //
  // So, we have to move all those markers after subsequent s_close tags.
  //
  while (loneMarkers.length) {
    let i = loneMarkers.pop() || 0;
    let j = i + 1;

    while (j < state.tokens.length && state.tokens[j].type === 's_close') {
      j++;
    }

    j--;

    if (i !== j) {
      swapToken(i,j)
    }
  }
};
