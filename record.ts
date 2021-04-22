import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Fn } from "./types.ts";

import { hasOwnProperty, pipe } from "./fns.ts";

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
 * Optimizations
 ******************************************************************************/

export const _map = <A, B, KS extends string>(
  fab: (a: A, i: string) => B,
  as: { [K in KS]: A },
): { [K in KS]: B } => {
  const keys = Object.keys(as) as KS[];
  const out: Partial<{ [K in KS]: B }> = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    out[key] = fab(as[key], key);
  }
  return out as { [K in KS]: B };
};

export const _reduce = <A, B, KS extends string>(
  faba: (b: B, a: A, i: string) => B,
  b: B,
  as: { [K in KS]: A },
): B => {
  const keys = Object.keys(as) as KS[];
  let out = b;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    out = faba(out, as[key], key);
  }
  return out;
};

export const _assign = <KS extends string>(i: KS) =>
  <R extends { [K in KS]: unknown }>(bs: R) =>
    (b: R[typeof i]): Partial<R> => {
      bs[i] = b;
      return bs;
    };

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fai) => (ta) => _map(fai, ta),
};

export const IndexedFunctor: TC.IndexedFunctor<URI, string> = {
  map: (fai) => (ta) => _map(fai, ta),
};

export const IndexedFoldable: TC.IndexedFoldable<
  URI,
  string
> = {
  reduce: (faba, a) => (tb) => _reduce(faba, a, tb),
};

export const IndexedTraversable: TC.IndexedTraversable<
  URI,
  string
> = {
  map: (fai) => (ta) => _map(fai, ta),
  reduce: IndexedFoldable.reduce,
  traverse: (A) =>
    (faui) =>
      (ta) =>
        _reduce(
          (ubs, a, index) =>
            pipe(
              faui(a, index),
              A.ap(pipe(ubs, A.map((is) => (i) => _assign(index)(is)(i)))),
            ),
          A.of({}),
          ta,
        ),
};

export const Foldable: TC.Foldable<URI> = IndexedFoldable;

export const Traversable = IndexedTraversable as TC.Traversable<URI>;

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <A>(SA: TC.Show<A>): TC.Show<Record<string, A>> => ({
  show: (ta) =>
    `{${
      Object.entries(ta).map(([key, value]) => `${key}: ${SA.show(value)}`)
        .join(", ")
    }}`,
});

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { traverse, reduce, map } = Traversable;

export const {
  traverse: indexedTraverse,
  reduce: indexedReduce,
  map: indexedMap,
} = IndexedTraversable;

export const insertAt = <K extends string, A>(k: K, a: A) =>
  <KS extends K>(
    r: Record<KS | K, A>,
  ): Record<KS | K, A> => (r[k] === a ? r : { ...r, [k]: a });

export const deleteAt = <K extends string>(k: K) =>
  <KS extends string, A>(
    r: Record<KS | K, A>,
  ): Record<Exclude<KS, K>, A> => {
    if (!hasOwnProperty.call(r, k)) {
      return r;
    }
    const out = Object.assign({}, r);
    delete out[k];
    return out;
  };

export const omit = <A, P extends keyof A>(
  props: [P, ...Array<P>],
  a: A,
): { [K in keyof A]: K extends P ? never : A[K] } => {
  const out: A = Object.assign({}, a);
  for (const k of props) {
    delete out[k];
  }
  return out as { [K in keyof A]: K extends P ? never : A[K] };
};

export const pick = <R, K extends keyof R>(...props: [K, K, ...K[]]) =>
  (record: R): Pick<R, K> => {
    const output: Partial<Pick<R, K>> = {};

    for (const k of props) {
      output[k] = record[k];
    }

    return output as Pick<R, K>;
  };

export const keys = <P extends Record<string, unknown>>(p: P): keyof P[] =>
  (Object.keys(p) as unknown) as keyof P[];

export const zipFirst = <A, I>(fabi: Fn<[string, A, unknown], I>) =>
  <KS extends string>(a: { [K in KS]: A }) =>
    (b: Record<string, unknown>): { [K in KS]: I } =>
      _map<A, I, KS>((a, key) => fabi(key, a, b[key]), a);
