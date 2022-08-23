import type { Lens } from "./lens.ts";
import type { Option } from "./option.ts";

import { fold, fromNullable } from "./option.ts";
import { deleteAt, insertAt } from "./record.ts";

export type At<S, I, A> = {
  readonly at: (i: I) => Lens<S, A>;
};

export function atRecord<A = never>(): At<
  Readonly<Record<string, A>>,
  string,
  Option<A>
> {
  return ({
    at: (key) => ({
      tag: "Lens",
      get: (r) => fromNullable(r[key]),
      set: fold(
        () => deleteAt(key),
        (a) => insertAt(key, a),
      ),
    }),
  });
}

export function atMap<A = never>(): At<Map<string, A>, string, Option<A>> {
  return ({
    at: (key) => ({
      tag: "Lens",
      get: (m) => fromNullable(m.get(key)),
      set: fold(
        () => (m) => {
          m.delete(key);
          return m;
        },
        (a) => (m) => m.set(key, a),
      ),
    }),
  });
}
