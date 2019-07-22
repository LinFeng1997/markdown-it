/**
 * class Renderer
 *
 * Generates HTML from parsed token stream. Each instance has independent
 * copy of rules. Those can be rewritten with ease. Also, you can add new
 * rules if you create plugin and adds new token types.
 **/




import Token from "../types/token";
import MarkdownIt = require("../types/index");

var assign          = require('./common/utils').assign;
var unescapeAll     = require('./common/utils').unescapeAll;
var escapeHtml      = require('./common/utils').escapeHtml;


////////////////////////////////////////////////////////////////////////////////
const getLangName = (info) => info ? info.split(/\s+/g)[0] : '';
const default_rules = {
  code_inline: function (tokens: Token[], idx: number, options: any, env: any, slf: Renderer): string {
    let token: Token = tokens[idx];

    return '<code' + slf.renderAttrs(token) + '>' +
      escapeHtml(tokens[idx].content) +
      '</code>';
  },
  code_block: function (tokens: Token[], idx: number, options: any, env: any, slf: Renderer): string {
    let token: Token = tokens[idx];

    return '<pre' + slf.renderAttrs(token) + '><code>' +
      escapeHtml(tokens[idx].content) +
      '</code></pre>\n';
  },
  fence: function (tokens: Token[], idx: number, options: any, env: any, slf: Renderer): string {
    let token:Token = tokens[idx],
      info = token.info ? unescapeAll(token.info).trim() : '',
      i: number;

    const getHighlight = () => {
      return options.highlight ? options.highlight(token.content, langName) || escapeHtml(token.content) : escapeHtml(token.content);
    }

    const getStr = (token) => {
      return '<pre><code' + slf.renderAttrs(token) + '>'
          + highlighted
          + '</code></pre>\n';
    }

    let langName = getLangName(info);

    let highlighted = getHighlight();
    if (highlighted.indexOf('<pre') === 0) {
      return highlighted + '\n';
    }

    // If language exists, inject class gently, without modifying original token.
    // May be, one day we will add .clone() for token and simplify this part, but
    // now we prefer to keep things local.
    if (info) {
      i = token.attrIndex('class');
      let tmpAttrs = token.attrs ? token.attrs.slice() : [];

      // Join
      if (i < 0) {
        tmpAttrs.push(['class', options.langPrefix + langName]);
      } else {
        tmpAttrs[i][1] += ' ' + options.langPrefix + langName;
      };

      return getStr({
        attrs: tmpAttrs
      });
    }

    return getStr(token);
  },
  image: function (tokens: Token[], idx: number, options: any, env: any, slf: Renderer): string {
    let token: any = tokens[idx];

    // "alt" attr MUST be set, even if empty. Because it's mandatory and
    // should be placed on proper position for tests.
    //
    // Replace content with actual value

    token.attrs[token.attrIndex('alt')][1] =
      slf.renderInlineAsText(token.children, options, env);

    return slf.renderToken(tokens, idx, options);
  },
  hardbreak: function (tokens, idx, options /*, env */) {
    return options.xhtmlOut ? '<br />\n' : '<br>\n';
  },
  softbreak: function (tokens, idx, options /*, env */) {
    return options.breaks ? (options.xhtmlOut ? '<br />\n' : '<br>\n') : '\n';
  },
  text: function (tokens, idx /*, options, env */) {
    return escapeHtml(tokens[idx].content);
  },
  html_block: function (tokens, idx /*, options, env */) {
    return tokens[idx].content;
  },
  html_inline: function (tokens, idx /*, options, env */) {
    return tokens[idx].content;
  }
};

/**
 * new Renderer()
 *
 * Creates new [[Renderer]] instance and fill [[Renderer#rules]] with defaults.
 **/
class Renderer {
  rules: { [name: string]: MarkdownIt.TokenRender };
  constructor() {
    /**
     * Renderer#rules -> Object
     *
     * Contains render rules for tokens. Can be updated and extended.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.renderer.rules.strong_open  = function () { return '<b>'; };
     * md.renderer.rules.strong_close = function () { return '</b>'; };
     *
     * var result = md.renderInline(...);
     * ```
     *
     * Each rule is called as independent static function with fixed signature:
     *
     * ```javascript
     * function my_token_render(tokens, idx, options, env, renderer) {
   *   // ...
   *   return renderedHTML;
   * }
     * ```
     *
     * See [source code](https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js)
     * for more details and examples.
     **/
    this.rules = assign({}, default_rules);
  }

  /**
   * Renderer.renderAttrs(token) -> String
   *
   * Render token attributes to string.
   **/
  renderAttrs(token: Token): string {
    if (!token.attrs) { return ''; }

    let result = '';

    for (let i = 0, l = token.attrs.length; i < l; i++) {
      result += ' ' + escapeHtml(token.attrs[i][0]) + '="' + escapeHtml(token.attrs[i][1]) + '"';
    }

    return result;
  };

  /**
   * Renderer.renderToken(tokens, idx, options) -> String
   * - tokens (Array): list of tokens
   * - idx (Numbed): token index to render
   * - options (Object): params of parser instance
   *
   * Default token renderer. Can be overriden by custom function
   * in [[Renderer#rules]].
   **/
  renderToken(tokens: Token[], idx: number, options: any): string {
    let result = '',
      token: Token = tokens[idx];

    // Tight list paragraphs
    if (token.hidden) {
      return '';
    }

    function containInlineTag(token) {
      // Block-level tag containing an inline tag.
      //
      return token.type === 'inline' || token.hidden
    }

    function sameTypeToken(token,nextToken) {
      // Opening tag + closing tag of the same type. E.g. `<li></li>`.
      //
      return nextToken.nesting === -1 && nextToken.tag === token.tag
    }

    function checkAddNewLine() {
      if (!token.block) {
        return false;
      }

      if (token.nesting === 1 && idx + 1 < tokens.length) {
        return !containInlineTag(tokens[idx + 1]) && !sameTypeToken(token, tokens[idx + 1])
      }

      return true;
    }

    // Insert a newline between hidden paragraph and subsequent opening
    // block-level tag.
    //
    // For example, here we should insert a newline before blockquote:
    //  - a
    //    >
    //
    if (token.block && token.nesting !== -1 && idx && tokens[idx - 1].hidden) {
      result += '\n';
    }

    // Add token name, e.g. `<img`
    result += (token.nesting === -1 ? '</' : '<') + token.tag;

    // Encode attributes, e.g. `<img src="foo"`
    result += this.renderAttrs(token);

    // Add a slash for self-closing tags, e.g. `<img src="foo" /`
    if (token.nesting === 0 && options.xhtmlOut) {
      result += ' /';
    }

    // Check if we need to add a newline after this tag
    let needLf = checkAddNewLine();

    result += needLf ? '>\n' : '>';

    return result;
  };

  /**
   * Renderer.renderInline(tokens, options, env) -> String
   * - tokens (Array): list on block tokens to renter
   * - options (Object): params of parser instance
   * - env (Object): additional data from parsed input (references, for example)
   *
   * The same as [[Renderer.render]], but for single token of `inline` type.
   **/
  renderInline(tokens: Token[], options: any, env: any): string {
    let type:string,
      result = '',
      rules = this.rules;

    for (let i = 0, len = tokens.length; i < len; i++) {
      type = tokens[i].type;

      if (typeof rules[type] !== 'undefined') {
        result += rules[type](tokens, i, options, env, this);
      } else {
        result += this.renderToken(tokens, i, options);
      }
    }

    return result;
  };


  /** internal
   * Renderer.renderInlineAsText(tokens, options, env) -> String
   * - tokens (Array): list on block tokens to renter
   * - options (Object): params of parser instance
   * - env (Object): additional data from parsed input (references, for example)
   *
   * Special kludge for image `alt` attributes to conform CommonMark spec.
   * Don't try to use it! Spec requires to show `alt` content with stripped markup,
   * instead of simple escaping.
   **/
  renderInlineAsText(tokens: Token[], options: any, env: any): string {
    let result = '';

    for (let i = 0, len = tokens.length; i < len; i++) {
      if (tokens[i].type === 'text') {
        result += tokens[i].content;
      } else if (tokens[i].type === 'image') {
        result += this.renderInlineAsText(tokens[i].children || [], options, env);
      }
    }

    return result;
  };

  /**
   * Renderer.render(tokens, options, env) -> String
   * - tokens (Array): list on block tokens to renter
   * - options (Object): params of parser instance
   * - env (Object): additional data from parsed input (references, for example)
   *
   * Takes token stream and generates HTML. Probably, you will never need to call
   * this method directly.
   **/
  render(tokens: Token[], options: any, env: any): string {
    let type: string,
      result = '',
      rules = this.rules;

    for (let i = 0, len = tokens.length; i < len; i++) {
      type = tokens[i].type;

      if (type === 'inline') {
        result += this.renderInline(tokens[i].children || [], options, env);
      } else if (typeof rules[type] !== 'undefined') {
        result += rules[tokens[i].type](tokens, i, options, env, this);
      } else {
        result += this.renderToken(tokens, i, options);
      }
    }

    return result;
  };

}
module.exports = Renderer;
