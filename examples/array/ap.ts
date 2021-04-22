import * as A from "../../array.ts";
import { pipe } from "../../fns.ts";

/**
 * Here we s
 */

const addOne = (n: number) => ({ type: "addOne", n, out: n + 1 });
const square = (n: number) => ({ type: "square", n, out: n * n });
const arrayOfFunctions = [addOne, square];
const arrayOfNumbers = [1, 2, 3];

const result1 = pipe(
  arrayOfNumbers,
  A.ap(arrayOfFunctions), // Applies every function to every number
);

console.log(JSON.stringify(result1, null, 2));
/*
[
  {
    "type": "addOne",
    "n": 1,
    "out": 2
  },
  {
    "type": "addOne",
    "n": 2,
    "out": 3
  },
  {
    "type": "addOne",
    "n": 3,
    "out": 4
  },
  {
    "type": "square",
    "n": 1,
    "out": 1
  },
  {
    "type": "square",
    "n": 2,
    "out": 4
  },
  {
    "type": "square",
    "n": 3,
    "out": 9
  }
]
*/
