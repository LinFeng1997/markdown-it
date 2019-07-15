// Process html tags



import StateInline from "./state_inline";

var HTML_TAG_RE = require('../common/html_re').HTML_TAG_RE;


function isLetter(ch) {
  /*eslint no-bitwise:0*/
  var lc = ch | 0x20; // to lower case
  return (lc >= 0x61/* a */) && (lc <= 0x7a/* z */);
}

function isFailedSecondCh(ch) {
  return ch !== 0x21/* ! */ &&
      ch !== 0x3F/* ? */ &&
      ch !== 0x2F/* / */ &&
      !isLetter(ch)
}

module.exports = function html_inline(state: StateInline, silent: boolean): boolean {
  let pos = state.pos;

  if (!state.md.options.html) { return false; }

  function isStart(){
    return state.src.charCodeAt(pos) === 0x3C/* < */ &&
        pos + 2 < state.posMax
  }

  // Check start
  if (!isStart()) {
    return false;
  }

  // Quick fail on second char
  if (isFailedSecondCh(state.src.charCodeAt(pos + 1))) {
    return false;
  }

  let match = state.src.slice(pos).match(HTML_TAG_RE);
  if (!match) { return false; }

  if (!silent) {
    let token         = state.push('html_inline', '', 0);
    token.content = state.src.slice(pos, pos + match[0].length);
  }
  state.pos += match[0].length;
  return true;
};
