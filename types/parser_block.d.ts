import MarkdownIt = require(".");
import Token from "./token";
import State from "./rules_core/state_core";

export = ParserBlock;

declare class ParserBlock {
    parse(src: string, md: MarkdownIt, env: any, outTokens: Token[]): void;
    ruler: MarkdownIt.RulerBlock;
    tokenize: (state: State, startLine: number, nextLine: number,slient?:boolean) => void
}
