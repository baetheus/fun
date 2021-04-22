import * as A from "../../array.ts";
import * as O from "../../option.ts";

const traverse = A.traverse(O.Applicative);

const criteria = O.fromPredicate((n: number) => n > 0);

// Will look through an array, if any of the criteria don't match it will return none,
// otherwise it will wrap the array in some
const positiveNumberTraverse = traverse(criteria);

const arrayOfNumbers1 = [1, 2, 3, 4, 5];

const arrayOfNumbers2 = [1, 2, 3, 4, -5];

const result1 = positiveNumberTraverse(arrayOfNumbers1);
const result2 = positiveNumberTraverse(arrayOfNumbers2);

console.log(result1); // { tag: "Some", value: [ 1, 2, 3, 4, 5 ] }
console.log(result2); // { tag: "None" }
