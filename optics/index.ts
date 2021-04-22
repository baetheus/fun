import type { Optional } from "./optional.ts";

import * as A from "../array.ts";
import * as O from "../option.ts";
import * as R from "../record.ts";
import { isNil, pipe } from "../fns.ts";

/*******************************************************************************
 * Models
 ******************************************************************************/

export type Index<S, I, A> = {
  readonly index: (i: I) => Optional<S, A>;
};

/*******************************************************************************
 * Instance Getters
 ******************************************************************************/

export const indexArray = <A = never>(): Index<
  ReadonlyArray<A>,
  number,
  A
> => ({
  index: (i) => ({
    getOption: A.lookup(i),
    set: (a) =>
      (as) =>
        pipe(
          A.updateAt(i, a)(as),
          O.getOrElse(() => as),
        ),
  }),
});

export const indexRecord = <A = never>(): Index<
  Readonly<Record<string, A>>,
  string,
  A
> => ({
  index: (k) => ({
    getOption: (r) => O.fromNullable(r[k]),
    set: (a) => (r) => (r[k] === a || isNil(r[k]) ? r : R.insertAt(k, a)(r)),
  }),
});
