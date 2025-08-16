import * as A from "../array.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

const count = 1_000_000;
const sorted = A.range(count);
const binarySearch = A.binarySearch(N.SortableNumber);
const monoSearch = A.monoSearch(N.SortableNumber);
const searches = pipe(A.range(count), A.map(() => Math.random() * count));
const expensiveOperation = (n: number) =>
  ((n ** Math.floor(n)) / (n ** (Math.floor(n) - 1))) +
  ((n ** Math.floor(n - 2)) / (n ** Math.floor(n - 3)));
const reducer = (acc: number, value: number) => acc + expensiveOperation(value);

Deno.bench("array native findIndex", { group: "binarySearch" }, () => {
  searches.forEach((value) => sorted.findIndex((n) => n <= value));
});

Deno.bench("array binarySearch", { group: "binarySearch" }, () => {
  searches.forEach((value) => binarySearch(value, sorted));
});

Deno.bench("array monoSearch", { group: "binarySearch" }, () => {
  searches.forEach((value) => monoSearch(value, sorted));
});

Deno.bench("array map", { group: "map" }, () => {
  pipe(searches, A.map(expensiveOperation));
});

Deno.bench("array native map", { group: "map" }, () => {
  searches.map(expensiveOperation);
});

Deno.bench("array fold", { group: "fold" }, () => {
  pipe(searches, A.fold(reducer, 0));
});

Deno.bench("array native reduce", { group: "fold" }, () => {
  searches.reduce(reducer, 0);
});
