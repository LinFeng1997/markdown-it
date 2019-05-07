// Normalize input string

'use strict';

import State from '../../types/rules_core/state_core';

const NEWLINES_RE = /\r[\n\u0085]?|[\u2424\u2028\u0085]/g;
const NULL_RE = /\u0000/g;


export = function normalize(state: State) {
  let str: string;

  // Normalize newlines
  str = state.src.replace(NEWLINES_RE, '\n');

  // Replace NULL characters
  str = str.replace(NULL_RE, '\uFFFD');

  state.src = str;
};
