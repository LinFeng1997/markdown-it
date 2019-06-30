// Proceess '\n'


import StateInline from "./state_inline";

var isSpace = require('../common/utils').isSpace;

module.exports = function newline(state: StateInline, silent: boolean): boolean {
  let pos: number = state.pos;

  if (state.src.charCodeAt(pos) !== 0x0A/* \n */) { return false; }

  function isWhite(pmax){
    return pmax >= 0 && state.pending.charCodeAt(pmax) === 0x20;
  }

  function getBreak(){
    if (isWhite(state.pending.length - 1)) {
      if (isWhite(state.pending.length - 2)) {
        state.pending = state.pending.replace(/ +$/, '');
        return {type: 'hardbreak', tag: 'br', nesting: 0}
      } else {
        state.pending = state.pending.slice(0, -1);
        return {type: 'softbreak', tag: 'br', nesting: 0}
      }

    } else {
      return {type: 'softbreak', tag: 'br', nesting: 0}
    }
  }

  let max = state.posMax;

  // '  \n' -> hardbreak
  // Lookup in pending chars is bad practice! Don't copy to other rules!
  // Pending string is stored in concat mode, indexed lookups will cause
  // convertion to flat mode.
  if (!silent) {
    const {type, tag, nesting} = getBreak();
    state.push(type, tag, nesting);
  }

  pos++;

  // skip heading spaces for next line
  while (pos < max && isSpace(state.src.charCodeAt(pos))) { pos++; }

  state.pos = pos;
  return true;
};
