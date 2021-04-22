import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Fn, Predicate } from "./types.ts";

import * as O from "./option.ts";
import { pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type TypeOf<T> = T extends ReadonlyArray<infer A> ? A : never;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "ReadonlyArray";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReadonlyArray<_[0]>;
  }
}

/*******************************************************************************
 * Optimizations
 ******************************************************************************/

export const _map = <A, B>(
  as: readonly A[],
  fab: (a: A, i: number) => B,
): Array<B> => {
  const out: B[] = new Array(as.length);
  for (let i = 0; i < as.length; i++) {
    out[i] = fab(as[i], i);
  }
  return out;
};

export const _reduce = <A, B>(
  as: readonly A[],
  fbab: (b: B, a: A, i: number) => B,
  b: B,
): B => {
  let out = b;
  for (let i = 0; i < as.length; i++) {
    out = fbab(out, as[i], i);
  }
  return out;
};

export const _concat = <A>(
  a: readonly A[],
  b: readonly A[],
): readonly A[] => {
  if (a.length === 0) {
    return b;
  }

  if (b.length === 0) {
    return a;
  }

  const result = Array(a.length + b.length);

  for (let i = 0; i < a.length; i++) {
    result[i] = a[i];
  }

  for (let i = 0; i < b.length; i++) {
    result[i + a.length] = b[i];
  }
  return result;
};

export const _flatten = <A>(aas: readonly (readonly A[])[]): readonly A[] => {
  if (aas.length === 0) {
    return (aas as unknown) as readonly A[];
  }

  const result: A[] = [];

  for (let i = 0; i < aas.length; i++) {
    const as = aas[i];
    if (as.length > 0) {
      for (let j = 0; j < as.length; j++) {
        result.push(as[j]);
      }
    }
  }

  return result;
};

export const _chain = <A, B>(fatb: Fn<[A], readonly B[]>) =>
  (ta: readonly A[]) => {
    if (ta.length === 0) {
      return [];
    }

    const result: B[] = [];

    for (let i = 0; i < ta.length; i++) {
      const bs = fatb(ta[i]);

      if (bs.length > 0) {
        for (let j = 0; j < bs.length; j++) {
          result.push(bs[j]);
        }
      }
    }

    return result;
  };

export const _filter = <A>(predicate: Predicate<A>) =>
  (as: readonly A[]): readonly A[] => {
    if (as.length === 0) {
      return as;
    }

    const result: A[] = Array(as.length);
    let l = 0;

    for (let i = 0; i < as.length; i++) {
      const a = as[i];
      if (predicate(a)) {
        result[l] = a;
        l++;
      }
    }

    result.length = l;
    return result;
  };

export const _isOutOfBounds = <A>(i: number, as: readonly A[]): boolean =>
  i < 0 || i >= as.length;

export const _unsafeInsertAt = <A>(
  i: number,
  a: A,
  as: ReadonlyArray<A>,
): ReadonlyArray<A> => {
  const xs = as.slice();
  xs.splice(i, 0, a);
  return xs;
};

export const _unsafeUpdateAt = <A>(
  i: number,
  a: A,
  as: ReadonlyArray<A>,
): ReadonlyArray<A> => {
  if (as[i] === a) {
    return as;
  } else {
    const xs = as.slice();
    xs[i] = a;
    return xs;
  }
};

export const _unsafeDeleteAt = <A>(
  i: number,
  as: ReadonlyArray<A>,
): ReadonlyArray<A> => {
  const xs = as.slice();
  xs.splice(i, 1);
  return xs;
};

export const _unsafePush = <A>(as: A[], a: A): A[] => {
  as.push(a);
  return as;
};

export const _append = <A>(as: readonly A[]) => (a: A) => [...as, a];

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const zero: ReadonlyArray<never> = [];

export const empty = <A = never>(): readonly A[] => zero;

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => _map(ta, fab),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) => (ta) => pipe(tfab, _chain((fab) => _map(ta, fab))),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: (a) => [a],
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: _chain,
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: _flatten,
  chain: Chain.chain,
};

export const Alt: TC.Alt<URI> = {
  alt: (tb) => (ta) => tb.length === 0 ? ta : tb,
  map: Functor.map,
};

export const Filterable: TC.Filterable<URI> = {
  filter: _filter,
};

export const IndexedFoldable: TC.IndexedFoldable<URI> = {
  reduce: (faba, a) => (tb) => _reduce(tb, faba, a),
};

export const IndexedTraversable: TC.IndexedTraversable<URI> = {
  map: (fai) => (ta) => _map(ta, fai),
  reduce: IndexedFoldable.reduce,
  traverse: (A) =>
    (fasi) =>
      (ta) =>
        _reduce(
          ta,
          (fbs, a, i) =>
            // deno-lint-ignore no-explicit-any
            pipe(fasi(a, i) as any, A.ap(pipe(fbs, A.map(_append)))),
          // deno-lint-ignore no-explicit-any
          A.of([] as any[]),
          // deno-lint-ignore no-explicit-any
        ) as any,
};

export const Foldable: TC.Foldable<URI> = IndexedFoldable;

export const Traversable: TC.Traversable<URI> = IndexedTraversable;

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getSetoid = <A>(S: TC.Setoid<A>): TC.Setoid<readonly A[]> => ({
  equals: (a) =>
    (b) =>
      a === b ||
      (a.length === b.length && a.every((v, i) => S.equals(v)(b[i]))),
});

export const getOrd = <A>(O: TC.Ord<A>): TC.Ord<readonly A[]> => {
  const { equals } = getSetoid(O);
  return ({
    equals,
    lte: (a) =>
      (b) => {
        const length = Math.min(a.length, b.length);
        for (let i = 0; i < length; i++) {
          if (!O.equals(a[i])(b[i])) {
            return O.lte(a[i])(b[i]);
          }
        }
        return a.length <= b.length;
      },
  });
};

export const getSemigroup = <A>(): TC.Semigroup<ReadonlyArray<A>> => ({
  concat: (a) => (b) => a.concat(b),
});

export const getShow = <A>({ show }: TC.Show<A>): TC.Show<readonly A[]> => ({
  show: (ta) => `ReadonlyArray[${ta.map(show).join(", ")}]`,
});

export const getMonoid = <A = never>(): TC.Monoid<readonly A[]> => ({
  empty,
  concat: (a) => (b) => _concat(a, b),
});

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const { reduce, traverse } = Traversable;

export const {
  map: indexedMap,
  reduce: indexedReduce,
  traverse: indexedTraverse,
} = IndexedTraversable;

export const { filter } = Filterable;

export const lookup = (i: number) =>
  <A>(as: readonly A[]): O.Option<A> =>
    _isOutOfBounds(i, as) ? O.none : O.some(as[i]);

export const insertAt = <A>(i: number, a: A) =>
  (as: readonly A[]): O.Option<readonly A[]> =>
    i < 0 || i > as.length ? O.none : O.some(_unsafeInsertAt(i, a, as));

export const updateAt = <A>(i: number, a: A) =>
  (as: readonly A[]): O.Option<readonly A[]> =>
    _isOutOfBounds(i, as) ? O.none : O.some(_unsafeUpdateAt(i, a, as));

export const deleteAt = (i: number) =>
  <A>(as: readonly A[]): O.Option<readonly A[]> =>
    _isOutOfBounds(i, as) ? O.none : O.some(_unsafeDeleteAt(i, as));
