/**
 * This file contains the Nil algebraic data type. Nil is a native form of the
 * Option algebraic data type. Instead of encapsulating a value in a tagged
 * union it uses the native `undefined` and `null` types built in to javascript.
 * Unfortunately, this makes its algebraic structure implementations unsound in
 * some cases, specifically when one wants to use undefined or null as
 * significant values (meaning they have some meaning beyond empty).
 *
 * @module Nil
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Either } from "./either.ts";
import type { Filterable } from "./filterable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import { handleThrow } from "./fn.ts";
import { fromCompare } from "./comparable.ts";
import { fromSort } from "./sortable.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * @since 2.0.0
 */
export type Nil<A> = A | undefined | null;

/**
 * @since 2.0.0
 */
export interface KindNil extends Kind {
  readonly kind: Nil<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function nil<A = never>(a: A): Nil<A> {
  return isNotNil(a) ? a : null;
}

/**
 * @since 2.0.0
 */
export function init<A = never>(): Nil<A> {
  return null;
}

/**
 * @since 2.0.0
 */
export function fail<A = never>(): Nil<A> {
  return null;
}

/**
 * @since 2.0.0
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>,
): (a: A) => Nil<B>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A> {
  return (ta) => isNotNil(ta) && predicate(ta) ? ta : null;
}

/**
 * @since 2.0.0
 */
export function fromOption<A>(ua: Option<A>): Nil<A> {
  return ua.tag === "None" ? null : ua.value;
}

/**
 * @since 2.0.0
 */
export function tryCatch<D extends unknown[], A>(
  fda: (...d: D) => A,
): (...d: D) => Nil<A> {
  return handleThrow(fda, nil, fail);
}

/**
 * @since 2.0.0
 */
export function match<A, I>(
  onNil: () => I,
  onValue: (a: A) => I,
): (ta: Nil<A>) => I {
  return (ta) => (isNil(ta) ? onNil() : onValue(ta));
}

/**
 * @since 2.0.0
 */
export function getOrElse<A>(onNil: () => A): (ta: Nil<A>) => A {
  return (ta) => isNil(ta) ? onNil() : ta;
}

/**
 * @since 2.0.0
 */
export function toNull<A>(ta: Nil<A>): A | null {
  return isNil(ta) ? null : ta;
}

/**
 * @since 2.0.0
 */
export function toUndefined<A>(ta: Nil<A>): A | undefined {
  return isNil(ta) ? undefined : ta;
}

/**
 * @since 2.0.0
 */
export function isNil<A>(ta: Nil<A>): ta is undefined | null {
  return ta === undefined || ta === null;
}

/**
 * @since 2.0.0
 */
export function isNotNil<A>(ta: Nil<A>): ta is NonNullable<A> {
  return !isNil(ta);
}

/**
 * @since 2.0.0
 */
export function wrap<A>(a: A): Nil<A> {
  return a;
}

/**
 * @since 2.0.0
 */
export function apply<A>(
  ua: Nil<A>,
): <I>(ufai: Nil<(a: A) => I>) => Nil<I> {
  return (ufai) => isNil(ua) ? null : isNil(ufai) ? null : ufai(ua);
}

/**
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Nil<A>) => Nil<I> {
  return (ta) => isNil(ta) ? null : fai(ta);
}

/**
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Nil<I>,
): (ta: Nil<A>) => Nil<I> {
  return (ta) => isNil(ta) ? null : fati(ta);
}

/**
 * @since 2.0.0
 */
export function alt<A>(tb: Nil<A>): (ta: Nil<A>) => Nil<A> {
  return (ta) => isNil(ta) ? tb : ta;
}

/**
 * @since 2.0.0
 */
export function exists<A>(predicate: Predicate<A>): (ua: Nil<A>) => boolean {
  return (ua) => isNotNil(ua) && predicate(ua);
}

/**
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ta: Nil<A>) => Nil<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A> {
  const _exists = exists(predicate);
  return (ta) => _exists(ta) ? ta : null;
}

/**
 * @since 2.0.0
 */
export function filterMap<A, I>(
  fai: (a: A) => Option<I>,
): (ua: Nil<A>) => Nil<I> {
  return flatmap((a) => fromOption(fai(a)));
}

/**
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: Nil<A>) => Pair<Nil<B>, Nil<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: Nil<A>) => Pair<Nil<A>, Nil<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: Nil<A>) => Pair<Nil<A>, Nil<A>> {
  type Output = Pair<Nil<A>, Nil<A>>;
  const init: Output = [null, null];
  return (ua) => isNil(ua) ? init : predicate(ua) ? [ua, null] : [null, ua];
}

/**
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  fai: (a: A) => Either<J, I>,
): (ua: Nil<A>) => Pair<Nil<I>, Nil<J>> {
  type Output = Pair<Nil<I>, Nil<J>>;
  const init: Output = [null, null];
  return (ua) => {
    if (isNil(ua)) {
      return init;
    }
    const result = fai(ua);
    return result.tag === "Right"
      ? [nil(result.right), null]
      : [null, nil(result.left)];
  };
}

/**
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicable<V>,
): <A, I, J, K, L, M>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Nil<A>) => $<V, [Nil<I>, J, K], [L], [M]> {
  return <A, I, J, K, L, M>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): (ta: Nil<A>) => $<V, [Nil<I>, J, K], [L], [M]> =>
    match(
      () => A.wrap(fail()),
      (a) => A.map((i: I) => nil(i))(favi(a)),
    );
}

/**
 * @since 2.0.0
 */
export function fold<A, O>(
  reducer: (accumulator: O, current: A) => O,
  initial: O,
): (ua: Nil<A>) => O {
  return (ua) => isNil(ua) ? initial : reducer(initial, ua);
}

/**
 * @since 2.0.0
 */
export function getShowableNil<A>({ show }: Showable<A>): Showable<Nil<A>> {
  return { show: (ma) => (isNil(ma) ? "nil" : show(ma)) };
}

/**
 * @since 2.0.0
 */
export function getComparableNil<A>(
  { compare }: Comparable<A>,
): Comparable<Nil<A>> {
  return fromCompare((second) => (first) =>
    isNotNil(first) && isNotNil(second)
      ? compare(second)(first)
      : isNil(first) && isNil(second)
  );
}

/**
 * @since 2.0.0
 */
export function getSortableNil<A>({ sort }: Sortable<A>): Sortable<Nil<A>> {
  return fromSort((fst, snd) =>
    isNil(fst) ? isNil(snd) ? 0 : -1 : isNil(snd) ? 1 : sort(fst, snd)
  );
}

/**
 * @since 2.0.0
 */
export function getCombinableNil<A>(
  { combine }: Combinable<A>,
): Combinable<Nil<A>> {
  return ({
    combine: (second) => (first) => {
      if (isNil(first)) {
        return isNil(second) ? null : second;
      } else if (isNil(second)) {
        return first;
      } else {
        return combine(second)(first);
      }
    },
  });
}

/**
 * @since 2.0.0
 */
export function getInitializableNil<A>(
  I: Initializable<A>,
): Initializable<Nil<A>> {
  return ({ init: () => nil(I.init()), ...getCombinableNil(I) });
}

/**
 * @since 2.0.0
 */
export const ApplicableNil: Applicable<KindNil> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const MappableNil: Mappable<KindNil> = { map };

/**
 * @since 2.0.0
 */
export const FilterableNil: Filterable<KindNil> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * @since 2.0.0
 */
export const FlatmappableNil: Flatmappable<KindNil> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FoldableNil: Foldable<KindNil> = { fold };

/**
 * @since 2.0.0
 */
export const TraversableNil: Traversable<KindNil> = {
  fold,
  map,
  traverse,
};

/**
 * @since 2.0.0
 */
export const WrappableNil: Wrappable<KindNil> = {
  wrap,
};

/**
 * @since 2.0.0
 */
export const tap = createTap(FlatmappableNil);

/**
 * @since 2.0.0
 */
export const bind = createBind(FlatmappableNil);

/**
 * @since 2.0.0
 */
export const bindTo = createBindTo(MappableNil);
