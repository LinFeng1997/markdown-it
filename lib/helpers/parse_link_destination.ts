// Parse link destination
//



var isSpace     = require('../common/utils').isSpace;
var unescapeAll = require('../common/utils').unescapeAll;



function getAllUnescapeStr(str,start,pos) {
  return unescapeAll(str.slice(start, pos))
}

module.exports = function parseLinkDestination(str: string, pos: number, max: number): {
  ok: boolean,
  pos: number,
  lines: number,
  str: string
} {
  let code: number,
    lines = 0,
    start = pos,
    result = {
      ok: false,
      pos: 0,
      lines: 0,
      str: ''
    };

  if (str.charCodeAt(pos) === 0x3C /* < */) {
    pos++;
    while (pos < max) {
      code = str.charCodeAt(pos);
      if (code === 0x0A /* \n */ || isSpace(code)) {
        return result;
      }
      if (code === 0x3E /* > */) {
        result.pos = pos + 1;
        result.str = getAllUnescapeStr(str, start + 1, pos);
        result.ok = true;
        return result;
      }
      if (code === 0x5C /* \ */ && pos + 1 < max) {
        pos += 2;
        continue;
      }

      pos++;
    }

    // no closing '>'
    return result;
  } else {
    let level = 0;
    while (pos < max) {
      code = str.charCodeAt(pos);

      if (code === 0x20) {
        break;
      }

      // ascii control characters
      if (code < 0x20 || code === 0x7F) {
        break;
      }

      if (code === 0x5C /* \ */ && pos + 1 < max) {
        pos += 2;
        continue;
      }

      if (code === 0x28 /* ( */) {
        level++;
      }

      if (code === 0x29 /* ) */) {
        if (level === 0) {
          break;
        }
        level--;
      }

      pos++;
    }

    if (start === pos || level !== 0) {
      return result;
    }

    result.str = getAllUnescapeStr(str, start, pos);
    result.lines = lines;
    result.pos = pos;
    result.ok = true;
    return result;
  }

};
