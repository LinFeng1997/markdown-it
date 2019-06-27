// heading (#, ##, ...)



import StateBlock from "./state_block";
import Token = require('../token');;

const isSpace = require('../common/utils').isSpace;

module.exports = function heading(state: StateBlock, startLine: number, endLine: number, silent: boolean) {
  let token: Token,
      pos: number = state.bMarks[startLine] + state.tShift[startLine],
      max: number = state.eMarks[startLine];

  // if it's indented more than 3 spaces, it should be a code block
  if (state.isMoreIndent(startLine)) { return false; }

  let ch  = state.src.charCodeAt(pos);

  if (ch !== 0x23/* # */ || pos >= max) { return false; }

  function countLevel(){
    // count heading level
    let level = 1;
    ch = state.src.charCodeAt(++pos);
    while (ch === 0x23/* # */ && pos < max && level <= 6) {
      level++;
      ch = state.src.charCodeAt(++pos);
    }
    return level;
  }

  function cutTails(){
    max = state.skipSpacesBack(max, pos);
    let tmp = state.skipCharsBack(max, 0x23, pos); // #
    if (tmp > pos && isSpace(state.src.charCodeAt(tmp - 1))) {
      max = tmp;
    }
  }
  // count heading level
  let level = countLevel();

  if (level > 6 || (pos < max && !isSpace(ch))) { return false; }

  if (silent) { return true; }

  // Let's cut tails like '    ###  ' from the end of string
  cutTails();

  state.line = startLine + 1;

  token        = state.push('heading_open', 'h' + String(level), 1);
  token.markup = '########'.slice(0, level);
  token.map    = [ startLine, state.line ];

  token          = state.push('inline', '', 0);
  token.content  = state.src.slice(pos, max).trim();
  token.map      = [ startLine, state.line ];
  token.children = [];

  token        = state.push('heading_close', 'h' + String(level), -1);
  token.markup = '########'.slice(0, level);

  return true;
};
