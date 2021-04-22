import * as E from "../../either.ts";

const mightThrow = (n: number) => {
  if (n > 0) {
    return n.toString();
  }
  throw new Error("Number out of range!");
};

const noThrow = E.tryCatchWrap(mightThrow, String);

const result1 = noThrow(1);
const result2 = noThrow(-1);

console.log(result1); // { tag: "Right", right: "1" }
console.log(result2); // { tag: "Left", left: "Error: Number out of range!" }
