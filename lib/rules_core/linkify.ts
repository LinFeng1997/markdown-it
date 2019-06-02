// Replace link-like texts with link nodes.
//
// Currently restricted by `md.validateLink()` to http/https/ftp
//


import State from '../../types/rules_core/state_core';
import Token = require('../token');

const arrayReplaceAt = require('../common/utils').arrayReplaceAt;


function isLinkOpen(str:string):boolean {
  return /^<a[>\s]/i.test(str);
}
function isLinkClose(str:string):boolean {
  return /^<\/a\s*>/i.test(str);
}


export = function linkify(state:State) {
  let blockTokens: Token[] = state.tokens,
      tokens: Token[],
      token: Token,
      fullUrl: string;

  if (!state.md.options.linkify) { return; }

  function skipMarkdownLinks(currentToken,i) {
    i--;
    while (tokens[i].level !== currentToken.level && tokens[i].type !== 'link_open') {
      i--;
    }
    return i;
  }

  function skipHtmlLinks(currentToken,htmlLinkLevel) {
    if (isLinkOpen(currentToken.content) && htmlLinkLevel > 0) {
      htmlLinkLevel--;
    }
    if (isLinkClose(currentToken.content)) {
      htmlLinkLevel++;
    }
    return htmlLinkLevel;
  }

  function getUrlText(link) {
    let url = link.url;
    fullUrl = state.md.normalizeLink(url);
    if (!state.md.validateLink(fullUrl)) { return ''; }

    let urlText = link.text;

    // Linkifier might send raw hostnames like "example.com", where url
    // starts with domain name. So we prepend http:// in those cases,
    // and remove it afterwards.
    //
    if (!link.schema) {
      urlText = state.md.normalizeLinkText('http://' + urlText).replace(/^http:\/\//, '');
    } else if (link.schema === 'mailto:' && !/^mailto:/i.test(urlText)) {
      urlText = state.md.normalizeLinkText('mailto:' + urlText).replace(/^mailto:/, '');
    } else {
      urlText = state.md.normalizeLinkText(urlText);
    }

    return urlText;
  }

  function getTokens({nodes,level,text,urlText,pos,lastPos}) {
    if (pos > lastPos) {
      token         = new state.Token('text', '', 0);
      token.content = text.slice(lastPos, pos);
      token.level   = level;
      nodes.push(token);
    }

    token         = new state.Token('link_open', 'a', 1);
    token.attrs   = [ [ 'href', fullUrl ] ];
    token.level   = level++;
    token.markup  = 'linkify';
    token.info    = 'auto';
    nodes.push(token);

    token         = new state.Token('text', '', 0);
    token.content = urlText;
    token.level   = level;
    nodes.push(token);

    token         = new state.Token('link_close', 'a', -1);
    token.level   = --level;
    token.markup  = 'linkify';
    token.info    = 'auto';
    nodes.push(token);
  }

  function getEndToken({nodes,level,text,lastPos}) {
    if (lastPos < text.length) {
      token         = new state.Token('text', '', 0);
      token.content = text.slice(lastPos);
      token.level   = level;
      nodes.push(token);
    }
  }

  for (let j = 0, l: number = blockTokens.length; j < l; j++) {
    if (blockTokens[j].type !== 'inline' ||
      !state.md.linkify.pretest(blockTokens[j].content)) {
      continue;
    }

    tokens = blockTokens[j].children || [];

    let htmlLinkLevel = 0;

    // We scan from the end, to keep position when new tags added.
    // Use reversed logic in links start/end match
    for (let i = tokens.length - 1; i >= 0; i--) {
      let currentToken = tokens[i];

      // Skip content of markdown links
      if (currentToken.type === 'link_close') {
        i = skipMarkdownLinks(currentToken,i);
        continue;
      }

      // Skip content of html tag links
      if (currentToken.type === 'html_inline') {
        htmlLinkLevel = skipHtmlLinks(currentToken,htmlLinkLevel);
      }

      if (htmlLinkLevel > 0) { continue; }

      if (currentToken.type === 'text' && state.md.linkify.test(currentToken.content)) {

        let text = currentToken.content;
        let links = state.md.linkify.match(text);

        // Now split string to nodes
        let nodes = [];
        let level = currentToken.level;
        let lastPos = 0;

        for (let i = 0; i < links.length; i++) {

          let urlText:string = getUrlText(links[i]);
          if (urlText === '') {
            continue;
          }


          getTokens({nodes,text, urlText,level,pos:links[i].index,lastPos});

          lastPos = links[i].lastIndex;
        }

        getEndToken({nodes,text,level,lastPos});

        // replace current node
        blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes);
      }
    }
  }
};
