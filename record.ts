import type {
  $,
  Applicative,
  Foldable,
  Functor,
  Kind,
  Out,
  Show,
  Traversable,
} from "./types.ts";

import type { Option } from "./option.ts";

import { none, some } from "./option.ts";
import { has, pipe } from "./fns.ts";

export type ReadonlyRecord<A> = Readonly<Record<string, A>>;

export interface URI extends Kind {
  readonly kind: ReadonlyRecord<Out<this, 0>>;
}

/**
 * Creates a new object with the same keys of `ta`. Values are transformed
 * using `fai`.
 *
 * ```ts
 * import { map } from "./record.ts"
 * map((n: number) => n + 1)({ a: 1 }); // { a: 2 }
 * ```
 */
export function map<A, I>(
  fai: (a: A, i: string) => I,
) {
  return (ta: ReadonlyRecord<A>): ReadonlyRecord<I> => {
    const out = {} as Record<string, I>;
    for (const [key, entry] of Object.entries(ta) as [string, A][]) {
      out[key] = fai(entry, key);
    }
    return out;
  };
}

export function reduce<A, O>(
  foao: (o: O, a: A, i: string) => O,
  o: O,
) {
  return (rec: ReadonlyRecord<A>): O => {
    let result = o;
    for (const key in rec) {
      result = foao(result, rec[key], key);
    }
    return result;
  };
}

export function traverse<V extends Kind>(
  A: Applicative<V>,
) {
  return <A, I, J, K, L, M>(
    favi: (a: A, i: string) => $<V, [I, J, K], [L], [M]>,
  ): (ta: ReadonlyRecord<A>) => $<V, [ReadonlyRecord<I>, J, K], [L], [M]> =>
    reduce(
      (fbs, a, index) =>
        pipe(
          favi(a, index),
          A.ap(pipe(
            fbs,
            A.map((xs: ReadonlyRecord<I>) => (x: I) => ({ ...xs, [index]: x })),
          )),
        ),
      A.of({} as ReadonlyRecord<I>),
    );
}

export function insert<A>(value: A) {
  return (key: string) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    rec[key] === value ? rec : { ...rec, [key]: value };
}

export function insertAt(key: string) {
  return <A>(value: A) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    rec[key] === value ? rec : { ...rec, [key]: value };
}

export function modify<A>(modifyFn: (a: A) => A) {
  return (key: string) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    has(rec, key) ? { ...rec, [key]: modifyFn(rec[key]) } : rec;
}

export function modifyAt(key: string) {
  return <A>(modifyFn: (a: A) => A) =>
  (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    has(rec, key) ? { ...rec, [key]: modifyFn(rec[key]) } : rec;
}

export function update<A>(value: A) {
  return (key: string) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    has(rec, key) ? { ...rec, [key]: value } : rec;
}

export function updateAt(key: string) {
  return <A>(value: A) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    has(rec, key) ? { ...rec, [key]: value } : rec;
}

export function lookupAt(key: string) {
  return <A>(rec: ReadonlyRecord<A>): Option<A> =>
    has(rec, key) ? some(rec[key]) : none;
}

export function deleteAtWithValue(key: string) {
  return <A>(
    rec: ReadonlyRecord<A>,
  ): Option<[A, ReadonlyRecord<A>]> => {
    if (has(rec, key)) {
      const out = { ...rec };
      const value = rec[key];
      delete out[key];
      return some([value, out]);
    }
    return none;
  };
}

export function deleteAt(key: string) {
  return <A>(
    rec: ReadonlyRecord<A>,
  ): ReadonlyRecord<A> => {
    if (has(rec, key)) {
      const out = { ...rec };
      delete out[key];
      return out;
    }
    return rec;
  };
}

export function lookupWithKey(key: string) {
  return <A>(record: ReadonlyRecord<A>): Option<[string, A]> => {
    if (Object.hasOwn(record, key)) {
      return some([key, record[key]]);
    }
    return none;
  };
}

export function lookup(key: string) {
  return <A>(record: ReadonlyRecord<A>): Option<A> => {
    if (Object.hasOwn(record, key)) {
      return some(record[key]);
    }
    return none;
  };
}

/**
 * Omit specified `keys` from a `record`. Value-space implementation of the
 * [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)
 * utility type.
 *
 * @example
 * ```ts
 * import { omit } from "./record.ts";
 * omit(["a", "c"])({ a: 1, b: 2 }) // { b: 2 }
 * ```
 *
 * @category combinators
 */
// deno-lint-ignore no-explicit-any
export function omit<T, K extends keyof any>(
  keys: readonly K[],
): (record: T) => Omit<T, K> {
  return (record: T) => {
    const output = Object.assign({}, record);
    for (const key of keys) {
      // deno-lint-ignore no-explicit-any
      delete (output as any)[key];
    }
    return output;
  };
}

/**
 * Picks specified `keys` from a `record`. Value-space implementation of the
 * [`Pick`](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys)
 * utility type.
 *
 * @example
 * import { pipe } from "./fns.ts";
 * import { pick } from "./record.ts";
 *
 * pipe({ a: 1, b: 2, c: 3 }, pick(["a", "b"]))
 * // { a: 1, b: 2 }
 *
 * @category combinators
 */
export function pick<T, K extends keyof T>(
  keys: readonly K[],
): (record: T) => Pick<T, K> {
  return (record) => {
    const output = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in record) {
        output[key] = record[key];
      }
    }
    return output;
  };
}

export function keys<P extends Record<string, unknown>>(p: P): (keyof P)[] {
  return (Object.keys(p) as unknown) as (keyof P)[];
}

export function zipFirst<A, Q, I>(
  fabi: (index: string, left: A, right: Q) => I,
) {
  return (
    right: ReadonlyRecord<Q>,
  ): (left: ReadonlyRecord<A>) => ReadonlyRecord<I> =>
    map((a: A, key) => fabi(key, a, right[key]));
}

export const FunctorRecord: Functor<URI> = { map };

export const FoldableRecord: Foldable<URI> = { reduce };

export const TraversableRecord: Traversable<URI> = {
  map,
  reduce,
  traverse,
};

export function getShow<A>(SA: Show<A>): Show<ReadonlyRecord<A>> {
  return ({
    show: (ta) =>
      `{${
        Object.entries(ta).map(([key, value]) => `${key}: ${SA.show(value)}`)
          .join(", ")
      }}`,
  });
}
