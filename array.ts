import type * as HKT from "./hkt.ts";
import { Kind, URIS } from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Predicate } from "./types.ts";

import * as O from "./option.ts";
import { createDo } from "./derivations.ts";
import { apply, flow, identity, pipe, swap } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type TypeOf<T> = T extends ReadonlyArray<infer A> ? A : never;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Array";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReadonlyArray<_[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export function empty<A = never>(): ReadonlyArray<A> {
  return [];
}

export function of<A>(a: A): ReadonlyArray<A> {
  return [a];
}

/*******************************************************************************
 * Unsafe Functions
 ******************************************************************************/

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

/*******************************************************************************
 * Functions
 ******************************************************************************/

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
  A: TC.Applicative<VRI>,
): <A, I, J, K, L>(
  favi: (a: A, i: number) => Kind<VRI, [I, J, K, L]>,
) => (ta: ReadonlyArray<A>) => Kind<VRI, [ReadonlyArray<I>, J, K, L]> {
  return (favi) =>
    reduce(
      (fbs, a, index) =>
        pipe(
          favi(a, index),
          A.ap(pipe(fbs, A.map((xs) => (x) => [...xs, x]))),
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

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

export const Alt: TC.Alt<URI> = { alt, map };

export const Filterable: TC.Filterable<URI> = { filter };

export const IndexedFoldable: TC.IndexedFoldable<URI> = { reduce };

export const IndexedTraversable: TC.IndexedTraversable<URI> = {
  map,
  reduce,
  traverse,
};

export const Foldable: TC.Foldable<URI> = IndexedFoldable;

export const Traversable: TC.Traversable<URI> = IndexedTraversable;

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export function getSetoid<A>(S: TC.Setoid<A>): TC.Setoid<ReadonlyArray<A>> {
  return ({
    equals: (a) =>
      (b) =>
        a === b ||
        (a.length === b.length && a.every((v, i) => S.equals(v)(b[i]))),
  });
}

export function getOrd<A>(O: TC.Ord<A>): TC.Ord<ReadonlyArray<A>> {
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
}

export function getSemigroup<A>(): TC.Semigroup<ReadonlyArray<A>> {
  return ({ concat });
}

export function getShow<A>({ show }: TC.Show<A>): TC.Show<ReadonlyArray<A>> {
  return ({
    show: (ta) => `Array[${ta.map(show).join(", ")}]`,
  });
}

export function getMonoid<A = never>(): TC.Monoid<ReadonlyArray<A>> {
  return ({
    empty,
    concat,
  });
}

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const createSequence = <VRI extends URIS>(
  A: TC.Applicative<VRI>,
): (<A, B, C, D>(
  ta: Kind<VRI, [A, B, C, D]>[],
) => Kind<VRI, [ReadonlyArray<A>, B, C, D]>) => {
  // deno-lint-ignore no-explicit-any
  return pipe(A.map(identity), traverse(A)) as any;
};

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
