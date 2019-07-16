// Process html entity - &#123;, &#xAF;, &quot;, ...



import StateInline from "./state_inline";

var entities          = require('../common/entities');
var has               = require('../common/utils').has;
var isValidEntityCode = require('../common/utils').isValidEntityCode;
var fromCodePoint     = require('../common/utils').fromCodePoint;


var DIGITAL_RE = /^&#((?:x[a-f0-9]{1,8}|[0-9]{1,8}));/i;
var NAMED_RE   = /^&([a-z][a-z0-9]{1,31});/i;


module.exports = function entity(state: StateInline, silent: boolean): boolean {
  let pos = state.pos,
    max = state.posMax;

  if (state.src.charCodeAt(pos) !== 0x26/* & */) { return false; }

  function matchReg(reg) {
    return state.src.slice(pos).match(reg);
  }

  function matchDigitalChar(match) {
    if (match) {
      if (!silent) {
        let code = match[1][0].toLowerCase() === 'x' ? parseInt(match[1].slice(1), 16) : parseInt(match[1], 10);
        state.pending += isValidEntityCode(code) ? fromCodePoint(code) : fromCodePoint(0xFFFD);
      }
      state.pos += match[0].length;
      return true;
    }
  }

  function matchNamedChar(match) {
    if (match && has(entities, match[1])) {
      if (!silent) {
        state.pending += entities[match[1]];
      }
      state.pos += match[0].length;
      return true;
    }
  }

  if (pos + 1 < max) {
    let ch = state.src.charCodeAt(pos + 1);

    if (ch === 0x23 /* # */ && matchDigitalChar(matchReg(DIGITAL_RE))) {
      return true;
    }

    if (matchNamedChar(matchReg(NAMED_RE))) {
      return true;
    }
  }

  if (!silent) { state.pending += '&'; }
  state.pos++;
  return true;
};
