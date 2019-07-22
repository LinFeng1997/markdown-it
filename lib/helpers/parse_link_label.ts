// Parse link label
//
// this function assumes that first character ("[") already matches;
// returns the end of the label
//


import StateInline = require("../../types/rules_inline/state_inline");

module.exports = function parseLinkLabel(state: StateInline, start: number, disableNested: boolean) {
  let found = false,
      oldPos = state.pos;

  state.pos = start + 1;
  let level = 1;

  function isEndMark(marker) {
    return marker === 0x5D /* ] */ && --level === 0
  }

  function isStartMark(marker,prevPos) {
    if (marker !== 0x5B /* [ */) {
      return false;
    }
    if (prevPos === state.pos - 1) {
      // increase level if we find text `[`, which is not a part of any token
      level++;
    } else if (disableNested) {
      state.pos = oldPos;
      return true;
    }
  }

  while (state.pos < state.posMax) {
    let marker = state.src.charCodeAt(state.pos);
    found = isEndMark(marker);
    if(found){
      break;
    }

    let prevPos = state.pos;
    state.md.inline.skipToken(state);
    if(isStartMark(marker,prevPos)){
      return -1;
    }
  }

  let labelEnd = -1;
  if (found) {
    labelEnd = state.pos;
  }

  // restore old state
  state.pos = oldPos;

  return labelEnd;
};
