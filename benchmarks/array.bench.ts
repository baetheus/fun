import * as A from "../array.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

const count = 100_000;
const sorted = A.range(count);
const binarySearch = A.binarySearch(N.SortableNumber);
const monoSearch = A.monoSearch(N.SortableNumber);
const searches = pipe(A.range(count), A.map(() => Math.random() * count));

Deno.bench("array binarySearch", { group: "binarySearch" }, () => {
  searches.forEach((value) => binarySearch(value, sorted));
});

Deno.bench("array monoSearch", { group: "binarySearch" }, () => {
  searches.forEach((value) => monoSearch(value, sorted));
});
