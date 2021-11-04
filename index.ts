import type { Optional } from "./optional.ts";

import { lookup, updateAt } from "./array.ts";
import { fromNullable, getOrElse } from "./option.ts";
import { insertAt } from "./record.ts";
import { isNil, pipe } from "./fns.ts";

export type Index<S, I, A> = {
  readonly index: (i: I) => Optional<S, A>;
};

export function indexArray<A>(): Index<ReadonlyArray<A>, number, A> {
  return ({
    index: (i) => ({
      tag: "Optional",
      getOption: lookup(i),
      set: (a) =>
        (as) =>
          pipe(
            updateAt(i, a)(as),
            getOrElse(() => as),
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
      getOption: (r) => fromNullable(r[k]),
      set: (a) => (r) => (r[k] === a || isNil(r[k]) ? r : insertAt(k, a)(r)),
    }),
  });
}
