// For each opening emphasis-like marker find a matching closing one
//

import StateInline from "./state_inline";

module.exports = function link_pairs(state: StateInline): void {
  let delimiters = state.delimiters,
      max: number = state.delimiters.length;

  function canOpen(currDelim,lastDelim) {
   return currDelim.open &&
    currDelim.marker === lastDelim.marker &&
    currDelim.end < 0 &&
    currDelim.level === lastDelim.level
  }

  // typeofs are for backward compatibility with plugins
  function oddMatch(currDelim,lastDelim) {
    return (currDelim.close || lastDelim.open) &&
        typeof currDelim.length !== 'undefined' &&
        typeof lastDelim.length !== 'undefined' &&
        (currDelim.length + lastDelim.length) % 3 === 0
  }

  for (let i = 0; i < max; i++) {
    let lastDelim = delimiters[i];

    if (!lastDelim.close) { continue; }

    let j = i - lastDelim.jump - 1;

    while (j >= 0) {
      let currDelim = delimiters[j];

      if (canOpen(currDelim,lastDelim) && !oddMatch(currDelim,lastDelim)) {
          lastDelim.jump = i - j;
          lastDelim.open = false;
          currDelim.end  = i;
          currDelim.jump = 0;
          break;
      }

      j -= currDelim.jump + 1;
    }
  }
};
