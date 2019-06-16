// Convert straight quotation marks to typographic ones
//

import Token = require('../token');
import State from '../../types/rules_core/state_core';
type Stack = {
  token: number,
  pos: number,
  single: boolean,
  level: number
}

const isWhiteSpace   = require('../common/utils').isWhiteSpace;
// const isPunctChar    = require('../common/utils').isPunctChar;
// const isMdAsciiPunct = require('../common/utils').isMdAsciiPunct;
const isCommonPunctChar = require('../common/utils').isCommonPunctChar;
const getFlanking = require('../common/utils').getFlanking;

const QUOTE_TEST_RE = /['"]/;
const QUOTE_RE = /['"]/g;
const APOSTROPHE = '\u2019'; /* ’ */


function replaceAt(str:string, index:number, ch:string):string {
  return str.substr(0, index) + ch + str.substr(index + 1);
}

function process_inlines(tokens:Token[], state:State) {
  let token: Token,
    j: number,
    stack: Stack[] = []

  function checkStack(level) {
    let j = stack.length - 1;
    for (; j >= 0; j--) {
      if (stack[j].level <= level) {
        break;
      }
    }
    return j;
  }

  function isSingleQuote(char) {
      return char === "'"
  }

  function isDoubleQuote(char) {
      return char === '"'
  }

  function getLastChar(text,index,i) {
      let lastChar = 0x20;
      if (index - 1 >= 0) {
          lastChar = text.charCodeAt(index - 1);
      } else {
          for (j = i - 1; j >= 0; j--) {
              if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak') break; // lastChar defaults to 0x20
              if (tokens[j].type !== 'text') continue;

              lastChar = tokens[j].content.charCodeAt(tokens[j].content.length - 1);
              break;
          }
      }
      return lastChar
  }

  function getNextChar(text,pos,max,i) {
      let nextChar = 0x20;
      if (pos < max) {
          nextChar = text.charCodeAt(pos);
      } else {
          for (j = i + 1; j < tokens.length; j++) {
              if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak') break; // nextChar defaults to 0x20
              if (tokens[j].type !== 'text') continue;

              nextChar = tokens[j].content.charCodeAt(0);
              break;
          }
      }
      return nextChar;
  }

  for (let i = 0; i < tokens.length; i++) {
    token = tokens[i];

    stack.length = checkStack(tokens[i].level) + 1;

    if (token.type !== 'text') { continue; }

    let text = token.content;
    let pos = 0;
    let max = text.length;

    /*eslint no-labels:0,block-scoped-var:0*/
    OUTER:
    while (pos < max) {
      QUOTE_RE.lastIndex = pos;
      let t = QUOTE_RE.exec(text);
      if (!t) { break; }

      pos = t.index + 1;
      let isSingle = isSingleQuote(t[0]);

      // Find previous character,
      // default to space if it's the beginning of the line
      //
      let lastChar = getLastChar(text,t.index,i);

      // Find next character,
      // default to space if it's the end of the line
      //
      let nextChar = getNextChar(text,pos,max,i);

      let isLastPunctChar = isCommonPunctChar(lastChar);
      let isNextPunctChar = isCommonPunctChar(nextChar);

      let isLastWhiteSpace = isWhiteSpace(lastChar);
      let isNextWhiteSpace = isWhiteSpace(nextChar);

      let canOpen = getFlanking(isNextWhiteSpace,isNextPunctChar,isLastWhiteSpace || isLastPunctChar);

      let canClose = getFlanking(isLastWhiteSpace,isLastPunctChar,isNextWhiteSpace || isNextPunctChar);

      if (nextChar === 0x22 /* " */ && isDoubleQuote(t[0])) {
        if (lastChar >= 0x30 /* 0 */ && lastChar <= 0x39 /* 9 */) {
          // special case: 1"" - count first quote as an inch
          canClose = canOpen = false;
        }
      }

      if (canOpen && canClose) {
        // treat this as the middle of the word
        canOpen = false;
        canClose = isNextPunctChar;
      }

      if (!canOpen && !canClose) {
        // middle of word
        if (isSingle) {
          token.content = replaceAt(token.content, t.index, APOSTROPHE);
        }
        continue;
      }

      if (canClose) {
        // this could be a closing quote, rewind the stack to get a match
        for (j = stack.length - 1; j >= 0; j--) {
          let item:Stack = stack[j];
          if (stack[j].level < tokens[i].level) { break; }
          if (item.single === isSingle && stack[j].level === tokens[i].level) {
            item = stack[j];

            let openQuote: string;
            let closeQuote: string;
            if (isSingle) {
              openQuote = state.md.options.quotes[2];
              closeQuote = state.md.options.quotes[3];
            } else {
              openQuote = state.md.options.quotes[0];
              closeQuote = state.md.options.quotes[1];
            }

            // replace token.content *before* tokens[item.token].content,
            // because, if they are pointing at the same token, replaceAt
            // could mess up indices when quote length != 1
            token.content = replaceAt(token.content, t.index, closeQuote);
            tokens[item.token].content = replaceAt(
              tokens[item.token].content, item.pos, openQuote);

            pos += closeQuote.length - 1;
            if (item.token === i) { pos += openQuote.length - 1; }

            text = token.content;
            max = text.length;

            stack.length = j;
            continue OUTER;
          }
        }
      }

      if (canOpen) {
        stack.push({
          token: i,
          pos: t.index,
          single: isSingle,
          level: tokens[i].level
        });
      } else if (canClose && isSingle) {
        token.content = replaceAt(token.content, t.index, APOSTROPHE);
      }
    }
  }
}


export = function smartquotes(state:State) {
  /*eslint max-depth:0*/
  if (!state.md.options.typographer) { return; }

  for (let blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {

    if (state.tokens[blkIdx].type !== 'inline' ||
        !QUOTE_TEST_RE.test(state.tokens[blkIdx].content)) {
      continue;
    }

    process_inlines(state.tokens[blkIdx].children || [], state);
  }
};
