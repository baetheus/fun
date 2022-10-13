import type { $, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Applicative } from "./applicative.ts";
import type { Filterable } from "./filterable.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Ord } from "./ord.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Setoid } from "./setoid.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import { pair } from "./pair.ts";
import { fromCompare, sign } from "./ord.ts";
import { none, some } from "./option.ts";
import { apply, flow, identity, pipe } from "./fn.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";

export type NonEmptyArray<A> = readonly [A, ...A[]];

export interface URI extends Kind {
  readonly kind: ReadonlyArray<Out<this, 0>>;
}

export type TypeOf<T> = T extends ReadonlyArray<infer A> ? A : never;

export function empty<A = never>(): ReadonlyArray<A> {
  return [];
}

export function of<A>(a: A): ReadonlyArray<A> {
  return [a];
}

export function isNonEmpty<A>(a: ReadonlyArray<A>): a is NonEmptyArray<A> {
  return a.length > 0;
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
): (ta: Array<A>) => Array<A> {
  return (ta) => {
    ta.push(last);
    return ta;
  };
}

export function unsafePrepend<A>(
  head: A,
): (ta: Array<A>) => Array<A> {
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
): (ta: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ta) => ta.length === 0 ? tb : ta;
}

export function map<A, I>(
  fai: (a: A, i: number) => I,
): (ta: ReadonlyArray<A>) => ReadonlyArray<I> {
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
): (ta: ReadonlyArray<A>) => O {
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
): (left: ReadonlyArray<A>) => ReadonlyArray<A> {
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
): (ta: ReadonlyArray<A>) => ReadonlyArray<I> {
  return flow(map(fati), join);
}

export function ap<A, I>(
  tfai: ReadonlyArray<(a: A) => I>,
): (ta: ReadonlyArray<A>) => ReadonlyArray<I> {
  return (ta) => pipe(tfai, chain(flow(map, apply(ta))));
}

export function filter<A>(
  predicate: Predicate<A>,
): (ta: ReadonlyArray<A>) => ReadonlyArray<A> {
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

export function traverse<V extends Kind>(
  A: Applicative<V>,
): <A, I, J, K, L, M>(
  favi: (a: A, i: number) => $<V, [I, J, K], [L], [M]>,
) => (ta: ReadonlyArray<A>) => $<V, [ReadonlyArray<I>, J, K], [L], [M]> {
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
): (ta: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ma) => [...ma, last];
}

export function prepend<A>(
  head: A,
): (ta: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ma) => [head, ...ma];
}

export function insert<A>(value: A) {
  return (index: number) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    index < 0 || index > arr.length ? arr : unsafeInsertAt(index, value, arr);
}

export function insertAt(index: number) {
  return <A>(value: A) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    index < 0 || index > arr.length ? arr : unsafeInsertAt(index, value, arr);
}

export function update<A>(value: A) {
  return (index: number) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr) ? arr : unsafeUpdateAt(index, value, arr);
}

export function updateAt(index: number) {
  return <A>(value: A) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr) ? arr : unsafeUpdateAt(index, value, arr);
}

export function modify<A>(modifyFn: (a: A) => A) {
  return (index: number) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr)
      ? arr
      : unsafeUpdateAt(index, modifyFn(arr[index]), arr);
}

export function modifyAt(index: number) {
  return <A>(modifyFn: (a: A) => A) =>
  (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr)
      ? arr
      : unsafeUpdateAt(index, modifyFn(arr[index]), arr);
}

export function lookup(i: number) {
  return <A>(as: ReadonlyArray<A>): Option<A> =>
    isOutOfBounds(i, as) ? none : some(as[i]);
}

export function deleteAt(index: number) {
  return <A>(arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr) ? arr : unsafeDeleteAt(index, arr);
}

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
 * import { pipe } from 'https://deno.land/x/fun/fn.ts'
 *
 * pipe([1, 2, 3], zipWith(['a', 'b', 'c', 'd'], (n, s) => s + n)))
 * // ['a1', 'b2', 'c3']
 *
 * @category combinators
 */
export const zipWith =
  <B, A, C>(fb: ReadonlyArray<B>, f: (a: A, b: B) => C) =>
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
 * import { pipe } from 'https://deno.land/x/fun/fn.ts'
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
 * import { unzip } from 'https://deno.land/x/fun/fn.ts'
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
  return (as) => as.slice().sort(O.compare);
}

export function partition<A, B extends A>(
  refinement: (a: A, index: number) => a is B,
): (ta: ReadonlyArray<A>) => Pair<ReadonlyArray<A>, ReadonlyArray<B>>;
export function partition<A, B extends A>(
  refinement: Refinement<A, B>,
): (ta: ReadonlyArray<A>) => Pair<ReadonlyArray<A>, ReadonlyArray<B>>;
export function partition<A>(
  predicate: (a: A, index: number) => boolean,
): (ta: ReadonlyArray<A>) => Pair<ReadonlyArray<A>, ReadonlyArray<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ta: ReadonlyArray<A>) => Pair<ReadonlyArray<A>, ReadonlyArray<A>>;
export function partition<A>(
  refinement: (a: A, index: number) => boolean,
): (ta: ReadonlyArray<A>) => Pair<ReadonlyArray<A>, ReadonlyArray<A>> {
  return (ta) => {
    const left: Array<A> = [];
    const right: Array<A> = [];
    const length = ta.length;
    let index = -1;

    while (++index < length) {
      const value = ta[index];
      if (refinement(value, index)) {
        right.push(value);
      } else {
        left.push(value);
      }
    }
    return pair(left, right);
  };
}

export const MonadArray: Monad<URI> = { of, ap, map, join, chain };

export const AltArray: Alt<URI> = { alt, map };

export const FilterableArray: Filterable<URI> = { filter };

export const TraversableArray: Traversable<URI> = {
  map,
  reduce,
  traverse,
};

export function getSetoid<A>(S: Setoid<A>): Setoid<ReadonlyArray<A>> {
  return ({
    equals: (a) => (b) => {
      if (a === b) {
        return true;
      } else if (a.length !== b.length) {
        return false;
      } else {
        return a.every((v, i) => S.equals(v)(b[i]));
      }
    },
  });
}

export function getOrd<A>(O: Ord<A>): Ord<ReadonlyArray<A>> {
  return fromCompare((fst, snd) => {
    const length = Math.min(fst.length, snd.length);
    let index = -1;
    // Compare all elements that exist in both arrays
    while (++index < length) {
      const ordering = O.compare(fst[index], snd[index]);
      if (ordering !== 0) return ordering;
    }
    // If all compared elements are equal, longest array is greater
    return sign(fst.length - snd.length);
  });
}

export function getSemigroup<A>(): Semigroup<ReadonlyArray<A>> {
  return ({ concat });
}

export function getShow<A>({ show }: Show<A>): Show<ReadonlyArray<A>> {
  return ({
    show: (ta) => `ReadonlyArray[${ta.map(show).join(", ")}]`,
  });
}

export function getMonoid<A = never>(): Monoid<ReadonlyArray<A>> {
  return ({
    empty,
    concat,
  });
}

export const createSequence = <V extends Kind>(
  A: Applicative<V>,
): <A, B, C, D, E>(
  ta: $<V, [A, B, C], [D], [E]>[],
) => $<V, [ReadonlyArray<A>, B, C], [D], [E]> => {
  return traverse(A)(A.map(identity));
};

export const sequenceTuple = createSequenceTuple(MonadArray);

export const sequenceStruct = createSequenceStruct(MonadArray);
