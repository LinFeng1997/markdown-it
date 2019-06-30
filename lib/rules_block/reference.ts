

import StateBlock from "./state_block";

const normalizeReference   = require('../common/utils').normalizeReference;
const isSpace              = require('../common/utils').isSpace;


module.exports = function reference(state:StateBlock, startLine:number, _endLine:number, silent:boolean) {
    let ch: number,
        label: number,
        start: number,
        title: string,
        lines: number = 0,
        pos: number = state.bMarks[startLine] + state.tShift[startLine],
        max: number = state.eMarks[startLine],
        nextLine = startLine + 1;

  // if it's indented more than 3 spaces, it should be a code block
  if (state.isMoreIndent(startLine)) { return false; }

  if (state.src.charCodeAt(pos) !== 0x5B/* [ */) { return false; }

  function quickCheckInterrupt() {
    // Simple check to quickly interrupt scan on [link](url) at the start of line.
    // Can be useful on practice: https://github.com/markdown-it/markdown-it/issues/54
    while (++pos < max) {
      if (state.src.charCodeAt(pos) === 0x5D /* ] */ && state.src.charCodeAt(pos - 1) !== 0x5C/* \ */) {
        if (pos + 1 === max || state.src.charCodeAt(pos + 1) !== 0x3A/* : */) { return false; }
        break;
      }
    }
  }

  function isTerminateParagraph(){
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    return terminate;
  }

  function scan(){
    for (let pos = 1; pos < max; pos++) {
      let ch = str.charCodeAt(pos);
      if (ch === 0x5B /* [ */) {
        return 0;
      } else if (ch === 0x5D /* ] */) {
        return pos;
      } else if (ch === 0x0A /* \n */) {
        lines++;
      } else if (ch === 0x5C /* \ */) {
        pos++;
        if (pos < max && str.charCodeAt(pos) === 0x0A) {
          lines++;
        }
      }
    }
    return 0;
  }

  function skipWhite(pos){
    for (; pos < max; pos++) {
      ch = str.charCodeAt(pos);
      if (ch === 0x0A) {
        lines++;
      } else if (isSpace(ch)) {
        /*eslint no-empty:0*/
      } else {
        break;
      }
    }
    return pos;
  }

  function skipTrailingSpaces(){
    while (pos < max) {
      let ch = str.charCodeAt(pos);
      if (!isSpace(ch)) { break; }
      pos++;
    }
  }

  quickCheckInterrupt();

  let endLine = state.lineMax;

  // jump line-by-line until empty one or EOF
  let terminatorRules = state.md.block.ruler.getRules('reference');

  let oldParentType = state.parentType;
  state.parentType = 'reference';

  for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
    // this would be a code block normally, but after paragraph
    // it's considered a lazy continuation regardless of what's there
    if (state.sCount[nextLine] - state.blkIndent > 3) { continue; }

    // quirk for blockquotes, this line should already be checked by that rule
    if (state.sCount[nextLine] < 0) { continue; }

    // Some tags can terminate paragraph without empty line.
    if (isTerminateParagraph()) { break; }
  }

  let str = state.getLines(startLine, nextLine, state.blkIndent, false).trim();
  max = str.length;

  let labelEnd = scan();

  if (labelEnd < 0 || str.charCodeAt(labelEnd + 1) !== 0x3A/* : */) { return false; }

  // [label]:   destination   'title'
  //         ^^^ skip optional whitespace here
  pos = skipWhite(labelEnd + 2);

  // [label]:   destination   'title'
  //            ^^^^^^^^^^^ parse this
  let res = state.md.helpers.parseLinkDestination(str, pos, max);
  if (!res.ok) { return false; }

  let href = state.md.normalizeLink(res.str);
  if (!state.md.validateLink(href)) { return false; }

  pos = res.pos;
  lines += res.lines;

  // save cursor state, we could require to rollback later
  let destEndPos = pos;
  let destEndLineNo = lines;

  // [label]:   destination   'title'
  //                       ^^^ skipping those spaces
  start = pos;
  pos = skipWhite(pos);

  // [label]:   destination   'title'
  //                          ^^^^^^^ parse this
  res = state.md.helpers.parseLinkTitle(str, pos, max);
  if (pos < max && start !== pos && res.ok) {
    title = res.str;
    pos = res.pos;
    lines += res.lines;
  } else {
    title = '';
    pos = destEndPos;
    lines = destEndLineNo;
  }

  // skip trailing spaces until the rest of the line
  skipTrailingSpaces();

  if (pos < max && str.charCodeAt(pos) !== 0x0A) {
    if (title) {
      // garbage at the end of the line after title,
      // but it could still be a valid reference if we roll back
      title = '';
      pos = destEndPos;
      lines = destEndLineNo;
      skipTrailingSpaces();
    }
  }

  if (pos < max && str.charCodeAt(pos) !== 0x0A) {
    // garbage at the end of the line
    return false;
  }

  label = normalizeReference(str.slice(1, labelEnd));
  if (!label) {
    // CommonMark 0.20 disallows empty labels
    return false;
  }

  // Reference can not terminate anything. This check is for safety only.
  /*istanbul ignore if*/
  if (silent) { return true; }

  if (typeof state.env.references === 'undefined') {
    state.env.references = {};
  }
  if (typeof state.env.references[label] === 'undefined') {
    state.env.references[label] = { title: title, href: href };
  }

  state.parentType = oldParentType;

  state.line = startLine + lines + 1;
  return true;
};
