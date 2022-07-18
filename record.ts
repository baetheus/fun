import type { Kind, URIS } from "./kind.ts";
import type * as T from "./types.ts";
import type { Fn } from "./types.ts";

import { hasOwnProperty, pipe } from "./fns.ts";
import { ordString, toCompare } from "./ord.ts";

export type ReadonlyRecord<V> = Readonly<Record<string, V>>;

export const URI = "ReadonlyRecord";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReadonlyRecord<_[0]>;
  }
}

const compareStrings = toCompare(ordString);

const sortStrings = (keys: string[]): string[] => keys.sort(compareStrings);

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
): <T>(ta: { [K in keyof T]: A }) => { [K in keyof T]: I } {
  return (ta) => {
    const out = {} as { [K in keyof typeof ta]: I };
    for (const [key, entry] of Object.entries(ta) as [keyof typeof ta, A][]) {
      out[key] = fai(entry, key as string);
    }
    return out;
  };
}

export function reduce<A, O>(
  foao: (o: O, a: A, i: string) => O,
  o: O,
): <KS extends string>(ta: { [K in KS]: A }) => O {
  return (ta) => {
    const keys = sortStrings(Object.keys(ta)) as (keyof typeof ta)[];
    const length = keys.length;
    let index = -1;
    let result = o;

    if (length === 0) {
      return o;
    }

    while (++index < length) {
      const key = keys[index];
      result = foao(result, ta[key], key);
    }
    return result;
  };
}

export function traverse<VRI extends URIS>(
  A: T.Applicative<VRI>,
): <A, I, J, K, L>(
  favi: (a: A, i: string) => Kind<VRI, [I, J, K, L]>,
) => (ta: ReadonlyRecord<A>) => Kind<VRI, [ReadonlyRecord<I>, J, K, L]> {
  return (favi) =>
    reduce(
      (fbs, a, index) =>
        pipe(
          favi(a, index),
          A.ap(pipe(fbs, A.map((xs) => (x) => ({ ...xs, [index]: x })))),
        ),
      // deno-lint-ignore no-explicit-any
      A.of({} as Record<string, any>),
    );
}

export function insertAt<K extends string, A>(
  k: K,
  a: A,
): <KS extends string>(ta: Record<KS | K, A>) => Record<KS | K, A> {
  return (ta) => (ta[k] === a ? ta : { ...ta, [k]: a });
}

export function deleteAt<K extends string>(
  k: K,
): <KS extends string, A>(ta: Record<KS | K, A>) => Record<Exclude<KS, K>, A> {
  return (ta) => {
    if (!hasOwnProperty.call(ta, k)) {
      return ta;
    }
    const out = Object.assign({}, ta);
    delete out[k];
    return out;
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

export function zipFirst<A, I>(
  fabi: Fn<[string, A, unknown], I>,
): (tb: Record<string, unknown>) => <T>(
  ta: { [K in keyof T]: A },
) => { [K in keyof T]: I } {
  return (tb) => map((a: A, key) => fabi(key, a, tb[key]));
}

export const Functor: T.Functor<URI> = { map };

export const IndexedFunctor: T.IndexedFunctor<URI, string> = { map };

export const IndexedFoldable: T.IndexedFoldable<URI, string> = { reduce };

export const IndexedTraversable: T.IndexedTraversable<URI, string> = {
  map,
  reduce,
  traverse,
};

export const Foldable: T.Foldable<URI> = IndexedFoldable;

export const Traversable: T.Traversable<URI> = IndexedTraversable;

export function getShow<A>(SA: T.Show<A>): T.Show<Record<string, A>> {
  return ({
    show: (ta) =>
      `{${
        Object.entries(ta).map(([key, value]) => `${key}: ${SA.show(value)}`)
          .join(", ")
      }}`,
  });
}
