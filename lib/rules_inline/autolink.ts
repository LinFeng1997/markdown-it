// Process autolinks '<protocol:...>'


import StateInline from "./state_inline";

/*eslint max-len:0*/
const EMAIL_RE    = /^<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;
const AUTOLINK_RE = /^<([a-zA-Z][a-zA-Z0-9+.\-]{1,31}):([^<>\x00-\x20]*)>/;


module.exports = function autolink(state: StateInline, silent: boolean): boolean {
  let pos = state.pos;

  if (state.src.charCodeAt(pos) !== 0x3C/* < */) { return false; }

  function getToken(href,link){
    let token         = state.push('link_open', 'a', 1);
    token.attrs   = [ [ 'href', href ] ];
    token.markup  = 'autolink';
    token.info    = 'auto';

    token         = state.push('text', '', 0);
    token.content = state.md.normalizeLinkText(link);

    token         = state.push('link_close', 'a', -1);
    token.markup  = 'autolink';
    token.info    = 'auto';
    return token;
  }

  function isAutoLink(reg,prefix=''){
    if (reg.test(tail)) {
      let linkMatch = tail.match(reg) || [];

      let url = linkMatch[0].slice(1, -1);
      let fullUrl = state.md.normalizeLink(prefix + url);
      if (!state.md.validateLink(fullUrl)) { return false; }

      if (!silent) {
        getToken(fullUrl,url);
      }

      state.pos += linkMatch[0].length;
      return true;
    }
    return false;
  }

  let tail = state.src.slice(pos);

  if (tail.indexOf('>') < 0) { return false; }

  return isAutoLink(AUTOLINK_RE) || isAutoLink(EMAIL_RE,'mailto:');
};
