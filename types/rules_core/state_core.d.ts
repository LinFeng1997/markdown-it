import MarkdownIt = require("..");
import Token from "../token";

export default class StateCore {
    env: any;
    level: number;

    /** Link to parser instance */
    md: MarkdownIt;

    /** The markdown source code that is being parsed. */
    src: string;

    tokens: Token[];

    /** Return any for a yet untyped property */
    [undocumented: string]: any;
}
