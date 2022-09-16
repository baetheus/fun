import * as SG from "../semigroup.ts";
import * as N from "../number.ts";
import * as S from "../string.ts";
import { pipe } from "../fns.ts";

const { concat: toList } = pipe(
  S.Semigroup,
  SG.intercalcate(", "),
);

export const list = pipe(
  "apples",
  toList("oranges"),
  toList("and bananas"),
); // list === "apples, oranges, and bananas"

console.log("intercalcate", { list });

export type T1 = {
  one: string;
  two: number;
};

const mySemi = SG.struct<T1>({
  one: SG.first(),
  two: N.SemigroupProduct,
});

const t1: T1 = { one: "Hello", two: 10 };
const t2: T1 = { one: "World", two: 12 };

const r1 = mySemi.concat(t1)(t2);

console.log(r1);
