import type * as HKT from "./hkt.ts";
import type { Kind, URIS } from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Fn } from "./types.ts";

import { hasOwnProperty, pipe } from "./fns.ts";
import { compare, ordString } from "./ord.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type ReadonlyRecord<V> = Readonly<Record<string, V>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "ReadonlyRecord";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReadonlyRecord<_[0]>;
  }
}

/*******************************************************************************
 * Utilities
 ******************************************************************************/

const compareStrings = compare(ordString);

const sortStrings = (keys: string[]): string[] => keys.sort(compareStrings);

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function map<A, I>(
  fai: (a: A, i: string) => I,
): <KS extends string>(ta: { [K in KS]: A }) => { [K in KS]: I } {
  return (ta) => {
    const out: Record<string, I> = {};
    for (const [key, entry] of Object.entries(ta) as [keyof typeof ta, A][]) {
      out[key] = fai(entry, key);
    }
    return out as { [K in keyof typeof ta]: I };
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
  A: TC.Applicative<VRI>,
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
): <KS extends K>(ta: Record<KS | K, A>) => Record<KS | K, A> {
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

export function omit<A, P extends keyof A>(
  props: [P, ...Array<P>],
  a: A,
): { [K in keyof A]: K extends P ? never : A[K] } {
  const out: A = Object.assign({}, a);
  for (const k of props) {
    delete out[k];
  }
  return out as { [K in keyof A]: K extends P ? never : A[K] };
}

export function pick<R, K extends keyof R>(
  ...props: [K, K, ...K[]]
): (ta: R) => Pick<R, K> {
  return (ta) => {
    const output: Partial<Pick<R, K>> = {};

    for (const k of props) {
      output[k] = ta[k];
    }

    return output as Pick<R, K>;
  };
}

export function keys<P extends Record<string, unknown>>(p: P): keyof P[] {
  return (Object.keys(p) as unknown) as keyof P[];
}

export function zipFirst<A, I>(
  fabi: Fn<[string, A, unknown], I>,
): (tb: Record<string, unknown>) => <KS extends string>(
  ta: { [K in KS]: A },
) => { [K in KS]: I } {
  return (tb) => map((a: A, key) => fabi(key, a, tb[key]));
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const IndexedFunctor: TC.IndexedFunctor<URI, string> = { map };

export const IndexedFoldable: TC.IndexedFoldable<URI, string> = { reduce };

export const IndexedTraversable: TC.IndexedTraversable<URI, string> = {
  map,
  reduce,
  traverse,
};

export const Foldable: TC.Foldable<URI> = IndexedFoldable;

export const Traversable: TC.Traversable<URI> = IndexedTraversable;

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export function getShow<A>(SA: TC.Show<A>): TC.Show<Record<string, A>> {
  return ({
    show: (ta) =>
      `{${
        Object.entries(ta).map(([key, value]) => `${key}: ${SA.show(value)}`)
          .join(", ")
      }}`,
  });
}
