// Process [link](<to> "stuff")


import StateInline from "./state_inline";
import Token = require("../token");

var normalizeReference   = require('../common/utils').normalizeReference;
var isSpace              = require('../common/utils').isSpace;


module.exports = function link(state: StateInline, silent: boolean): boolean {
  let title: string = '',
    href = '',
    oldPos = state.pos,
    max = state.posMax,
    start = state.pos,
    parseReference = true;

  if (state.src.charCodeAt(state.pos) !== 0x5B/* [ */) { return false; }
  function skipLinkSpace() {
    for (; pos < max; pos++) {
      let code = state.src.charCodeAt(pos);
      if (!isSpace(code) && code !== 0x0A) { break; }
    }
  }
  function parseLinkDes() {
    href = '';
    let res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
    if (res.ok) {
      href = state.md.normalizeLink(res.str);
      if (state.md.validateLink(href)) {
        pos = res.pos;
      } else {
        href = '';
      }
    }
  }
  function parseLinkTitle() {
    let res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
    if (pos < max && start !== pos && res.ok) {
      title = res.str;
      pos = res.pos;

      // [link](  <href>  "title"  )
      //                         ^^ skipping these spaces
      skipLinkSpace();
    } else {
      title = '';
    }
  }
  function isLink(){
    if (pos < max && state.src.charCodeAt(pos) === 0x28/* ( */) {
      //
      // Inline link
      //

      // might have found a valid shortcut link, disable reference parsing
      parseReference = false;

      // [link](  <href>  "title"  )
      //        ^^ skipping these spaces
      pos++;
      skipLinkSpace();
      if (pos >= max) { return false; }

      // [link](  <href>  "title"  )
      //          ^^^^^^ parsing link destination
      parseLinkDes();

      // [link](  <href>  "title"  )
      //                ^^ skipping these spaces
      skipLinkSpace();

      // [link](  <href>  "title"  )
      //                  ^^^^^^^ parsing link title
      parseLinkTitle();

      if (pos >= max || state.src.charCodeAt(pos) !== 0x29/* ) */) {
        // parsing a valid shortcut link failed, fallback to reference
        parseReference = true;
      }
      pos++;
    }
    return true;
  }
  function parseLinkRef(){
    let label = '';
    if (pos < max && state.src.charCodeAt(pos) === 0x5B/* [ */) {
      start = pos + 1;
      pos = state.md.helpers.parseLinkLabel(state, pos);
      if (pos >= 0) {
        label = state.src.slice(start, pos++);
      } else {
        pos = labelEnd + 1;
      }
    } else {
      pos = labelEnd + 1;
    }

    // covers label === '' and label === undefined
    // (collapsed reference link and shortcut reference link respectively)
    if (!label) { label = state.src.slice(labelStart, labelEnd); }

    let ref = state.env.references[normalizeReference(label)];
    return ref;
  }

  let labelStart = state.pos + 1;
  let labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, true);

  // parser failed to find ']', so it's not a valid link
  if (labelEnd < 0) { return false; }

  let pos = labelEnd + 1;

  if(!isLink()){
    return false;
  }
  if (parseReference) {
    //
    // Link reference
    //
    if (typeof state.env.references === 'undefined') { return false; }

    let ref = parseLinkRef();
    if (!ref) {
      state.pos = oldPos;
      return false;
    }
    href = ref.href;
    title = ref.title;
  }

  //
  // We found the end of the link, and know for a fact it's a valid link;
  // so all that's left to do is to call tokenizer.
  //
  if (!silent) {
    state.pos = labelStart;
    state.posMax = labelEnd;

    let token        = state.push('link_open', 'a', 1);
    token.attrs  = [ [ 'href', href ] ];
    if (title) {
      token.attrs.push([ 'title', title ]);
    }

    state.md.inline.tokenize(state);

    token        = state.push('link_close', 'a', -1);
  }

  state.pos = pos;
  state.posMax = max;
  return true;
};
