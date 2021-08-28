import type { Lens } from "./lens.ts";

import * as O from "../option.ts";
import * as R from "../record.ts";

/*******************************************************************************
 * Models
 ******************************************************************************/

export type At<S, I, A> = {
  readonly at: (i: I) => Lens<S, A>;
};

/*******************************************************************************
 * Instance Getters
 ******************************************************************************/

export function atRecord<A = never>(): At<
  Readonly<Record<string, A>>,
  string,
  O.Option<A>
> {
  return ({
    at: (key) => ({
      get: (r) => O.fromNullable(r[key]),
      set: O.fold(
        () => R.deleteAt(key),
        (a) => R.insertAt(key, a),
      ),
    }),
  });
}

export function atMap<A = never>(): At<Map<string, A>, string, O.Option<A>> {
  return ({
    at: (key) => ({
      get: (m) => O.fromNullable(m.get(key)),
      set: O.fold(
        () =>
          (m) => {
            m.delete(key);
            return m;
          },
        (a) => (m) => m.set(key, a),
      ),
    }),
  });
}
