import * as A from "../array.ts";
import * as O from "../option.ts";
import { identity, pipe } from "../fns.ts";

const sequence = A.createSequence(O.Applicative);

console.log(sequence([O.some(1), O.some(2)])); // { tag: "Some", value: [ 1, 2 ] }
console.log(sequence([O.none, O.some(2)])); // { tag: "None" }
