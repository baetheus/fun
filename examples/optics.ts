import * as O from "../optics.ts";
import * as P from "../predicate.ts";
import * as N from "../number.ts";
import * as I from "../iterable.ts";
import { pipe, todo } from "../fn.ts";

export type Friends = {
  people: readonly {
    name: string;
    pets?: readonly {
      name: string;
      nickname?: string;
      toys: readonly string[];
    }[];
  }[];
};

// Lens easily deep into a structure.
export const toysOptic = pipe(
  O.id<Friends>(),
  O.prop("people"),
  O.array,
  O.prop("pets"),
  O.nilable,
  O.array,
  O.prop("toys"),
  O.array,
);

// Lens over an array of numbers
// and collect them all into a single predicate
export const testFactors = pipe(
  O.id<readonly number[]>(),
  O.array,
  O.concatAll(P.getMonoidAll<number>(), N.divides),
);

const t1 = testFactors([2, 3]);
const t2 = testFactors([4, 6]);

pipe(
  I.range(20),
  I.forEach((number) =>
    console.log({ number, test1: t1(number), test2: t2(number) })
  ),
);
