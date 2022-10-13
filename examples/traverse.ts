import * as A from "../array.ts";
import * as T from "../async.ts";
import { pipe } from "../fn.ts";

const traversePar = A.traverse(T.MonadAsyncParallel);
const traverseSeq = A.traverse(T.MonadAsyncSequential);

const addNumberToIndex = (a: number, i: number) =>
  pipe(T.of(a + i), T.delay(100 * a));

const sumPar = traversePar(addNumberToIndex);
const sumSeq = traverseSeq(addNumberToIndex);

const asyncPar = sumPar([1, 2, 3, 4, 5]);
const asyncSeq = sumSeq([1, 2, 3, 4, 5]);

// Parallel takes as long as the longest delay, ~500ms
asyncPar().then((result) => console.log("Parallel", result));

// Sequential takes as long as the sum of delays, ~1500ms
asyncSeq().then((result) => console.log("Sequential", result));
