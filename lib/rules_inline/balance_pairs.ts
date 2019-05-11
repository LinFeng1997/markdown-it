// For each opening emphasis-like marker find a matching closing one
//
'use strict';
import StateInline from "./state_inline";
import MarkdownIt = require("../../index");

module.exports = function link_pairs(state: StateInline): void {
    let lastDelim: MarkdownIt.Delimiter,
        currDelim: MarkdownIt.Delimiter,
        delimiters = state.delimiters,
        max: number = state.delimiters.length;

  for (let i = 0; i < max; i++) {
    lastDelim = delimiters[i];

    if (!lastDelim.close) { continue; }

    let j = i - lastDelim.jump - 1;

    while (j >= 0) {
      currDelim = delimiters[j];

      if (currDelim.open &&
          currDelim.marker === lastDelim.marker &&
          currDelim.end < 0 &&
          currDelim.level === lastDelim.level) {

        // typeofs are for backward compatibility with plugins
        var odd_match = (currDelim.close || lastDelim.open) &&
                        typeof currDelim.length !== 'undefined' &&
                        typeof lastDelim.length !== 'undefined' &&
                        (currDelim.length + lastDelim.length) % 3 === 0;

        if (!odd_match) {
          lastDelim.jump = i - j;
          lastDelim.open = false;
          currDelim.end  = i;
          currDelim.jump = 0;
          break;
        }
      }

      j -= currDelim.jump + 1;
    }
  }
};
