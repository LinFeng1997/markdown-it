export default class Token {
    constructor(type: string, tag: string, nesting: number);
    attrGet: (name: string) => string | null;
    attrIndex: (name: string) => number;
    attrJoin: (name: string, value: string) => void;
    attrPush: (attrData: string[]) => void;
    attrSet: (name: string, value: string) => void;
    attrs: string[][] | null;
    block: boolean;
    children: Token[] | null;
    content: string;
    hidden: boolean;
    info: string;
    level: number;
    map: number[] | null;
    markup: string;
    meta: any;
    nesting: number;
    tag: string;
    type: string;
}
