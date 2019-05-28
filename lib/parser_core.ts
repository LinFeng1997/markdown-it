/** internal
 * class Core
 *
 * Top-level rules executor. Glues block/inline parsers and does intermediate
 * transformations.
 **/


import RulerType from './ruler';
import State from '../types/rules_core/state_core';
const Ruler = require('./ruler');

var _rules = [
  [ 'normalize',      require('./rules_core/normalize')      ],
  [ 'block',          require('./rules_core/block')          ],
  [ 'inline',         require('./rules_core/inline')         ],
  [ 'linkify',        require('./rules_core/linkify')        ],
  [ 'replacements',   require('./rules_core/replacements')   ],
  [ 'smartquotes',    require('./rules_core/smartquotes')    ]
];


/**
 * new Core()
 **/
class Core {
  ruler: RulerType;
  /**
   * Core#ruler -> Ruler
   *
   * [[Ruler]] instance. Keep configuration of core rules.
   **/
  constructor(){
    this.ruler = new Ruler();

    for (let i = 0; i < _rules.length; i++) {
      this.ruler.push(_rules[i][0], _rules[i][1]);
    }
  }

  /**
   * Core.process(state)
   *
   * Executes core chain rules.
   **/
  process(state: State) {
    let rules = this.ruler.getRules('');

    for (let i = 0, l = rules.length; i < l; i++) {
      rules[i](state);
    }
  };

  State = require('./rules_core/state_core');
}

module.exports = Core;
