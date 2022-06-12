import { Kind, URIS } from "./kind.ts";
import type * as T from "./types.ts";
import type { Predicate } from "./types.ts";

import * as O from "./option.ts";
import { createDo } from "./derivations.ts";
import { apply, flow, identity, pipe } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";
import { Ord, toCompare } from "./ord.ts";

export type TypeOf<T> = T extends ReadonlyArray<infer A> ? A : never;

export const URI = "Array";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReadonlyArray<_[0]>;
  }
}

export function empty<A = never>(): ReadonlyArray<A> {
  return [];
}

export function of<A>(a: A): ReadonlyArray<A> {
  return [a];
}

export function isOutOfBounds<A>(index: number, ta: ReadonlyArray<A>): boolean {
  return index < 0 || index >= ta.length;
}

export function unsafeInsertAt<A>(
  index: number,
  a: A,
  ta: ReadonlyArray<A>,
): ReadonlyArray<A> {
  const result = ta.slice();
  result.splice(index, 0, a);
  return result;
}

export function unsafeUpdateAt<A>(
  index: number,
  a: A,
  ta: ReadonlyArray<A>,
): ReadonlyArray<A> {
  if (ta[index] === a) {
    return ta;
  } else {
    const result = ta.slice();
    result[index] = a;
    return result;
  }
}

export function unsafeDeleteAt<A>(
  index: number,
  ta: ReadonlyArray<A>,
): ReadonlyArray<A> {
  const result = ta.slice();
  result.splice(index, 1);
  return result;
}

export function unsafeAppend<A>(
  last: A,
): ((ta: Array<A>) => Array<A>) {
  return (ta) => {
    ta.push(last);
    return ta;
  };
}

export function unsafePrepend<A>(
  head: A,
): ((ta: Array<A>) => Array<A>) {
  return (ta) => {
    ta.unshift(head);
    return ta;
  };
}

export function isEmpty<A>(ta: ReadonlyArray<A>): boolean {
  return ta.length === 0;
}

export function alt<A>(
  tb: ReadonlyArray<A>,
): ((ta: ReadonlyArray<A>) => ReadonlyArray<A>) {
  return (ta) => ta.length === 0 ? tb : ta;
}

export function map<A, I>(
  fai: (a: A, i: number) => I,
): ((ta: ReadonlyArray<A>) => ReadonlyArray<I>) {
  return (ta) => {
    let index = -1;
    const length = ta.length;
    const result = new Array(length);

    while (++index < length) {
      result[index] = fai(ta[index], index);
    }

    return result;
  };
}

export function reduce<A, O>(
  foao: (o: O, a: A, i: number) => O,
  o: O,
): ((ta: ReadonlyArray<A>) => O) {
  return (ta) => {
    let result = o;
    let index = -1;
    const length = ta.length;

    while (++index < length) {
      result = foao(result, ta[index], index);
    }

    return result;
  };
}

export function concat<A>(
  right: ReadonlyArray<A>,
): ((left: ReadonlyArray<A>) => ReadonlyArray<A>) {
  if (right.length === 0) {
    return identity;
  }

  return (left) => {
    const leftLength = left.length;
    const length = leftLength + right.length;
    const result = Array(length);
    let index = -1;

    while (++index < leftLength) {
      result[index] = left[index];
    }

    index--;

    while (++index < length) {
      result[index] = right[index - leftLength];
    }

    return result;
  };
}

export function join<A>(
  taa: ReadonlyArray<ReadonlyArray<A>>,
): ReadonlyArray<A> {
  let index = -1;
  const length = taa.length;
  const result = new Array<A>();

  while (++index < length) {
    const ta = taa[index];
    let _index = -1;
    const _length = ta.length;
    while (++_index < _length) {
      result.push(ta[_index]);
    }
  }

  return result;
}

export function chain<A, I>(
  fati: (a: A) => ReadonlyArray<I>,
): ((ta: ReadonlyArray<A>) => ReadonlyArray<I>) {
  return flow(map(fati), join);
}

export function ap<A, I>(
  tfai: ReadonlyArray<(a: A) => I>,
): ((ta: ReadonlyArray<A>) => ReadonlyArray<I>) {
  return (ta) => pipe(tfai, chain(flow(map, apply(ta))));
}

export function filter<A>(
  predicate: Predicate<A>,
): ((ta: ReadonlyArray<A>) => ReadonlyArray<A>) {
  return (ta) => {
    let index = -1;
    let resultIndex = 0;
    const length = ta.length;
    const result = [];

    while (++index < length) {
      const value = ta[index];
      if (predicate(value)) {
        result[resultIndex++] = value;
      }
    }
    return result;
  };
}

export function traverse<VRI extends URIS>(
  A: T.Applicative<VRI>,
): <A, I, J, K, L>(
  favi: (a: A, i: number) => Kind<VRI, [I, J, K, L]>,
) => (ta: ReadonlyArray<A>) => Kind<VRI, [ReadonlyArray<I>, J, K, L]> {
  return (favi) =>
    reduce(
      (vis, a, index) =>
        pipe(
          favi(a, index),
          A.ap(pipe(vis, A.map((xs) => (x): readonly unknown[] => [...xs, x]))),
        ),
      // deno-lint-ignore no-explicit-any
      A.of([] as ReadonlyArray<any>),
    );
}

export function append<A>(
  last: A,
): ((ta: ReadonlyArray<A>) => ReadonlyArray<A>) {
  return (ma) => [...ma, last];
}

export function prepend<A>(
  head: A,
): ((ta: ReadonlyArray<A>) => ReadonlyArray<A>) {
  return (ma) => [head, ...ma];
}

export const lookup = (i: number) =>
  <A>(as: ReadonlyArray<A>): O.Option<A> =>
    isOutOfBounds(i, as) ? O.none : O.some(as[i]);

export const insertAt = <A>(i: number, a: A) =>
  (as: ReadonlyArray<A>): O.Option<ReadonlyArray<A>> =>
    i < 0 || i > as.length ? O.none : O.some(unsafeInsertAt(i, a, as));

export const updateAt = <A>(i: number, a: A) =>
  (as: ReadonlyArray<A>): O.Option<ReadonlyArray<A>> =>
    isOutOfBounds(i, as) ? O.none : O.some(unsafeUpdateAt(i, a, as));

export const deleteAt = (i: number) =>
  <A>(as: ReadonlyArray<A>): O.Option<ReadonlyArray<A>> =>
    isOutOfBounds(i, as) ? O.none : O.some(unsafeDeleteAt(i, as));

/**
 * Create a `ReadonlyArray` containing a range of integers,
 * including both endpoints.
 *
 * @example
 * import { range } from 'https://deno.land/x/fun/array.ts'
 *
 * range(1, 5)
 * // [1, 2, 3, 4, 5]
 *
 * @category constructors
 */
export const range = (
  start: number,
  end: number,
): ReadonlyArray<number> => {
  const result: Array<number> = [];
  if (start >= end) return result;
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
};

/**
 * `zipWith` take a function to specify how to combine elements of two
 * `ReadonlyArray`s
 *
 * If one input `ReadonlyArray` is short, excess elements of the
 * longer `ReadonlyArray` are discarded.
 *
 * @example
 * import { zipWith } from 'https://deno.land/x/fun/array.ts'
 * import { pipe } from 'https://deno.land/x/fun/fns.ts'
 *
 * pipe([1, 2, 3], zipWith(['a', 'b', 'c', 'd'], (n, s) => s + n)))
 * // ['a1', 'b2', 'c3']
 *
 * @category combinators
 */
export const zipWith = <B, A, C>(fb: ReadonlyArray<B>, f: (a: A, b: B) => C) =>
  (
    fa: ReadonlyArray<A>,
  ): ReadonlyArray<C> => {
    const fc: Array<C> = [];
    const len = Math.min(fa.length, fb.length);
    for (let i = 0; i < len; i++) {
      fc[i] = f(fa[i], fb[i]);
    }
    return fc;
  };

/**
 * `zip` function creates an `ReadonlyArray` of pairs elements, the first of
 * which contains the first elements of the given `ReadonlyArray`s, the second
 * of which contains the second elements of the given arrays, and so on.
 *
 * If one input `ReadonlyArray` is short, excess elements of the
 * longer `ReadonlyArray` are discarded.
 *
 * @example
 * import { zip } from 'https://deno.land/x/fun/array.ts'
 * import { pipe } from 'https://deno.land/x/fun/fns.ts'
 *
 * pipe([1, 2, 3], zip(['a', 'b', 'c', 'd'])))
 * // [[1, 'a'], [2, 'b'], [3, 'c']]
 *
 * @category combinators
 */
export const zip: <B>(
  bs: ReadonlyArray<B>,
) => <A>(as: ReadonlyArray<A>) => ReadonlyArray<[A, B]> = (bs) =>
  zipWith(bs, (a, b) => [a, b]);

/**
 * `unzip` function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @example
 * import { unzip } from 'https://deno.land/x/fun/fns.ts'
 *
 * unzip([[1, 'a'], [2, 'b'], [3, 'c']])
 * // [[1, 2, 3], ['a', 'b', 'c']]
 *
 * @category combinators
 */
export const unzip = <A, B>(
  as: ReadonlyArray<[A, B]>,
): readonly [ReadonlyArray<A>, ReadonlyArray<B>] => {
  const fa: Array<A> = [];
  const fb: Array<B> = [];
  for (let i = 0; i < as.length; i++) {
    fa[i] = as[i][0];
    fb[i] = as[i][1];
  }
  return [fa, fb];
};

/**
 * Returns a new array containing elements of `as` sorted in ascending order
 * according to the sort order defined by `O`.
 *
 * @example
 * import { ordNumber } from "./ord.ts";
 * import { sort } from './array.ts'
 *
 * sort(ordNumber)([3, 1, 2])
 * // [1, 2, 3]
 *
 * @category combinators
 */
export function sort<B>(
  O: Ord<B>,
): <A extends B>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  const _compare = toCompare(O);
  return (as) => as.slice().sort(_compare);
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const Alt: T.Alt<URI> = { alt, map };

export const Filterable: T.Filterable<URI> = { filter };

export const IndexedFoldable: T.IndexedFoldable<URI> = { reduce };

export const IndexedTraversable: T.IndexedTraversable<URI> = {
  map,
  reduce,
  traverse,
};

export const Foldable: T.Foldable<URI> = IndexedFoldable;

export const Traversable: T.Traversable<URI> = IndexedTraversable;

export function getSetoid<A>(S: T.Setoid<A>): T.Setoid<ReadonlyArray<A>> {
  return ({
    equals: (a) =>
      (b) =>
        a === b ||
        (a.length === b.length && a.every((v, i) => S.equals(v)(b[i]))),
  });
}

export function getOrd<A>(O: T.Ord<A>): T.Ord<ReadonlyArray<A>> {
  const { equals } = getSetoid(O);
  return ({
    equals,
    lte: (b) =>
      (a) => {
        const length = Math.min(a.length, b.length);
        let index = -1;
        while (++index < length) {
          if (!O.equals(a[index])(b[index])) {
            return O.lte(b[index])(a[index]);
          }
        }
        return a.length <= b.length;
      },
  });
}

export function getSemigroup<A>(): T.Semigroup<ReadonlyArray<A>> {
  return ({ concat });
}

export function getShow<A>({ show }: T.Show<A>): T.Show<ReadonlyArray<A>> {
  return ({
    show: (ta) => `ReadonlyArray[${ta.map(show).join(", ")}]`,
  });
}

export function getMonoid<A = never>(): T.Monoid<ReadonlyArray<A>> {
  return ({
    empty,
    concat,
  });
}

export const createSequence = <VRI extends URIS>(
  A: T.Applicative<VRI>,
): (<A, B, C, D>(
  ta: Kind<VRI, [A, B, C, D]>[],
) => Kind<VRI, [ReadonlyArray<A>, B, C, D]>) => {
  // deno-lint-ignore no-explicit-any
  return pipe(A.map(identity), traverse(A)) as any;
};

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
