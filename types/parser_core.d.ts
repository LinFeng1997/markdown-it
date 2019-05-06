import MarkdownIt = require(".");
import Ruler = require("./ruler");
import Token from "./token";

export = ParserCore;

declare class ParserCore {
    process(state: any): void;
    ruler: Ruler;
}
