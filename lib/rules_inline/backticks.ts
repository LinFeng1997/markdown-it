// Parse backticks


import StateInline from "./state_inline";
import Token = require("../token");

module.exports = function backtick(state: StateInline, silent: boolean): boolean {
  let matchStart: number,
    token: Token,
    pos: number = state.pos,
    ch: number = state.src.charCodeAt(pos);

  if (ch !== 0x60/* ` */) { return false; }

  function genToken(){
    token         = state.push('code_inline', 'code', 0);
    token.markup  = marker;
    token.content = state.src.slice(pos, matchStart)
        .replace(/[ \n]+/g, ' ')
        .trim();
  }

  let start = pos++;
  let max = state.posMax;

  while (pos < max && state.src.charCodeAt(pos) === 0x60/* ` */) { pos++; }

  let marker = state.src.slice(start, pos);

  let matchEnd = pos;

  while ((matchStart = state.src.indexOf('`', matchEnd)) !== -1) {
    matchEnd = matchStart + 1;

    while (matchEnd < max && state.src.charCodeAt(matchEnd) === 0x60/* ` */) { matchEnd++; }

    if (matchEnd - matchStart === marker.length) {
      if (!silent) {
        genToken();
      }
      state.pos = matchEnd;
      return true;
    }
  }

  if (!silent) { state.pending += marker; }
  state.pos += marker.length;
  return true;
};