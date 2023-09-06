import { flow } from "../fn.ts";
import * as P from "../promise.ts";

const asyncAddOne = (n: number) => P.of(n + 1);

const test = flow(
  (n: number) => P.of(n),
  P.then(asyncAddOne),
); // (n: number) => Promise<number>
