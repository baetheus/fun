import * as A from "../array.ts";
import * as AS from "../async.ts";
import * as I from "../iterable.ts";
import * as T from "../tree.ts";
import { pipe } from "../fn.ts";

const traversePar = A.traverse(AS.FlatmappableAsync);
const traverseSeq = A.traverse(AS.FlatmappableAsyncSeq);

const addNumberToIndex = (a: number, i: number) =>
  pipe(AS.wrap(a + i), AS.delay(100 * a));

const sumPar = traversePar(addNumberToIndex);
const sumSeq = traverseSeq(addNumberToIndex);

const asyncPar = sumPar([1, 2, 3, 4, 5]);
const asyncSeq = sumSeq([1, 2, 3, 4, 5]);

// Parallel takes as long as the longest delay, ~500ms
asyncPar().then((result) => console.log("Parallel", result));

// Sequential takes as long as the sum of delays, ~1500ms
asyncSeq().then((result) => console.log("Sequential", result));

const traverseTreeIterable = T.traverse(I.FlatmappableIterable);
