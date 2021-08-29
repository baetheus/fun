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

export function indexArray<A>(): Index<ReadonlyArray<A>, number, A> {
  return ({
    index: (i) => ({
      tag: "Optional",
      getOption: A.lookup(i),
      set: (a) =>
        (as) =>
          pipe(
            A.updateAt(i, a)(as),
            O.getOrElse(() => as),
          ),
    }),
  });
}

export function indexRecord<A>(): Index<
  Readonly<Record<string, A>>,
  string,
  A
> {
  return ({
    index: (k) => ({
      tag: "Optional",
      getOption: (r) => O.fromNullable(r[k]),
      set: (a) => (r) => (r[k] === a || isNil(r[k]) ? r : R.insertAt(k, a)(r)),
    }),
  });
}
