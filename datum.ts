/**
 * This file contains the Datum  algebraic data type. Datum represents an
 * optional value that has an additional notation for a pending state.
 *
 * @module Datum
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Either } from "./either.ts";
import type { Filterable } from "./filterable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import * as O from "./option.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { fromSort } from "./sortable.ts";
import { isNotNil } from "./nil.ts";
import { flow, handleThrow, identity, pipe } from "./fn.ts";

/**
 * The Initial state represents a datum that has not been loaded yet.
 *
 * @since 2.0.0
 */
export type Initial = {
  readonly tag: "Initial";
};

/**
 * The Pending state represents a datum that is currently loading.
 *
 * @since 2.0.0
 */
export type Pending = {
  readonly tag: "Pending";
};

/**
 * The Refresh state represents a datum that is refreshing with stale data.
 *
 * @since 2.0.0
 */
export type Refresh<A> = {
  readonly tag: "Refresh";
  readonly value: A;
};

/**
 * The Replete state represents a datum that has been fully loaded.
 *
 * @since 2.0.0
 */
export type Replete<A> = {
  readonly tag: "Replete";
  readonly value: A;
};

/**
 * The Datum type represents an optional value with loading states.
 *
 * @since 2.0.0
 */
export type Datum<A> = Initial | Pending | Refresh<A> | Replete<A>;

/**
 * The None type represents states without a value.
 *
 * @since 2.0.0
 */
export type None = Initial | Pending;

/**
 * The Some type represents states with a value.
 *
 * @since 2.0.0
 */
export type Some<A> = Refresh<A> | Replete<A>;

/**
 * The Loading type represents states that are currently loading.
 *
 * @since 2.0.0
 */
export type Loading<A> = Pending | Refresh<A>;

/**
 * Specifies Datum as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindDatum extends Kind {
  readonly kind: Datum<Out<this, 0>>;
}

/**
 * Create an Initial datum.
 *
 * @example
 * ```ts
 * import { initial } from "./datum.ts";
 *
 * const datum = initial;
 * console.log(datum); // { tag: "Initial" }
 * ```
 *
 * @since 2.0.0
 */
export const initial: Initial = { tag: "Initial" };

/**
 * Create a Pending datum.
 *
 * @example
 * ```ts
 * import { pending } from "./datum.ts";
 *
 * const datum = pending;
 * console.log(datum); // { tag: "Pending" }
 * ```
 *
 * @since 2.0.0
 */
export const pending: Pending = { tag: "Pending" };

/**
 * Create a Refresh datum with a value.
 *
 * @example
 * ```ts
 * import { refresh } from "./datum.ts";
 *
 * const datum = refresh("stale data");
 * console.log(datum); // { tag: "Refresh", value: "stale data" }
 * ```
 *
 * @since 2.0.0
 */
export function refresh<D>(value: D): Datum<D> {
  return ({ tag: "Refresh", value });
}

/**
 * Create a Replete datum with a value.
 *
 * @example
 * ```ts
 * import { replete } from "./datum.ts";
 *
 * const datum = replete("fresh data");
 * console.log(datum); // { tag: "Replete", value: "fresh data" }
 * ```
 *
 * @since 2.0.0
 */
export function replete<D>(value: D): Datum<D> {
  return ({ tag: "Replete", value });
}

/**
 * Create a constant Initial datum.
 *
 * @example
 * ```ts
 * import { constInitial } from "./datum.ts";
 *
 * const datum = constInitial();
 * console.log(datum); // { tag: "Initial" }
 * ```
 *
 * @since 2.0.0
 */
export function constInitial<A = never>(): Datum<A> {
  return initial;
}

/**
 * Create a constant Pending datum.
 *
 * @example
 * ```ts
 * import { constPending } from "./datum.ts";
 *
 * const datum = constPending();
 * console.log(datum); // { tag: "Pending" }
 * ```
 *
 * @since 2.0.0
 */
export function constPending<A = never>(): Datum<A> {
  return pending;
}

/**
 * Create a Datum from a nullable value.
 *
 * @example
 * ```ts
 * import { fromNullable } from "./datum.ts";
 *
 * const datum1 = fromNullable("value"); // Replete("value")
 * const datum2 = fromNullable(null); // Initial
 * ```
 *
 * @since 2.0.0
 */
export function fromNullable<A>(a: A): Datum<NonNullable<A>> {
  return isNotNil(a) ? replete(a) : initial;
}

/**
 * Create a Datum from a function that might throw.
 *
 * @example
 * ```ts
 * import { tryCatch } from "./datum.ts";
 *
 * const safeParse = tryCatch(JSON.parse);
 * const result1 = safeParse('{"key": "value"}'); // Replete({key: "value"})
 * const result2 = safeParse('invalid json'); // Initial
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<AS extends unknown[], A>(
  fasr: (...as: AS) => A,
): (...as: AS) => Datum<A> {
  return handleThrow(
    fasr,
    replete,
    constInitial,
  );
}

/**
 * Convert a Datum to a Loading state.
 *
 * @example
 * ```ts
 * import { toLoading, replete, initial } from "./datum.ts";
 *
 * const datum1 = toLoading(replete("data")); // Refresh("data")
 * const datum2 = toLoading(initial); // Pending
 * ```
 *
 * @since 2.0.0
 */
export function toLoading<A>(ta: Datum<A>): Datum<A> {
  return pipe(
    ta,
    match(
      constPending,
      constPending,
      refresh,
      refresh,
    ),
  );
}

/**
 * Check if a Datum is in the Initial state.
 *
 * @example
 * ```ts
 * import { isInitial, initial, pending, replete } from "./datum.ts";
 *
 * console.log(isInitial(initial)); // true
 * console.log(isInitial(pending)); // false
 * console.log(isInitial(replete("data"))); // false
 * ```
 *
 * @since 2.0.0
 */
export function isInitial<A>(ta: Datum<A>): ta is Initial {
  return ta.tag === "Initial";
}

/**
 * Check if a Datum is in the Pending state.
 *
 * @example
 * ```ts
 * import { isPending, initial, pending, replete } from "./datum.ts";
 *
 * console.log(isPending(initial)); // false
 * console.log(isPending(pending)); // true
 * console.log(isPending(replete("data"))); // false
 * ```
 *
 * @since 2.0.0
 */
export function isPending<A>(ta: Datum<A>): ta is Pending {
  return ta.tag === "Pending";
}

/**
 * Check if a Datum is in the Refresh state.
 *
 * @example
 * ```ts
 * import { isRefresh, initial, refresh, replete } from "./datum.ts";
 *
 * console.log(isRefresh(initial)); // false
 * console.log(isRefresh(refresh("data"))); // true
 * console.log(isRefresh(replete("data"))); // false
 * ```
 *
 * @since 2.0.0
 */
export function isRefresh<A>(ta: Datum<A>): ta is Refresh<A> {
  return ta.tag === "Refresh";
}

/**
 * Check if a Datum is in the Replete state.
 *
 * @example
 * ```ts
 * import { isReplete, initial, refresh, replete } from "./datum.ts";
 *
 * console.log(isReplete(initial)); // false
 * console.log(isReplete(refresh("data"))); // false
 * console.log(isReplete(replete("data"))); // true
 * ```
 *
 * @since 2.0.0
 */
export function isReplete<A>(ta: Datum<A>): ta is Replete<A> {
  return ta.tag === "Replete";
}

/**
 * Check if a Datum has no value (Initial or Pending).
 *
 * @example
 * ```ts
 * import { isNone, initial, pending, replete } from "./datum.ts";
 *
 * console.log(isNone(initial)); // true
 * console.log(isNone(pending)); // true
 * console.log(isNone(replete("data"))); // false
 * ```
 *
 * @since 2.0.0
 */
export function isNone<A>(ta: Datum<A>): ta is None {
  return isInitial(ta) || isPending(ta);
}

/**
 * Check if a Datum has a value (Refresh or Replete).
 *
 * @example
 * ```ts
 * import { isSome, initial, refresh, replete } from "./datum.ts";
 *
 * console.log(isSome(initial)); // false
 * console.log(isSome(refresh("data"))); // true
 * console.log(isSome(replete("data"))); // true
 * ```
 *
 * @since 2.0.0
 */
export function isSome<A>(ta: Datum<A>): ta is Some<A> {
  return isRefresh(ta) || isReplete(ta);
}

/**
 * Check if a Datum is loading (Pending or Refresh).
 *
 * @example
 * ```ts
 * import { isLoading, initial, pending, refresh, replete } from "./datum.ts";
 *
 * console.log(isLoading(initial)); // false
 * console.log(isLoading(pending)); // true
 * console.log(isLoading(refresh("data"))); // true
 * console.log(isLoading(replete("data"))); // false
 * ```
 *
 * @since 2.0.0
 */
export function isLoading<A>(ta: Datum<A>): ta is Loading<A> {
  return isPending(ta) || isRefresh(ta);
}

/**
 * Pattern match on a Datum to extract values.
 *
 * @example
 * ```ts
 * import { match, initial, pending, refresh, replete } from "./datum.ts";
 *
 * const matcher = match(
 *   () => "Not started",
 *   () => "Loading...",
 *   (value) => `Fresh: ${value}`,
 *   (value) => `Stale: ${value}`
 * );
 *
 * console.log(matcher(initial)); // "Not started"
 * console.log(matcher(pending)); // "Loading..."
 * console.log(matcher(refresh("data"))); // "Stale: data"
 * console.log(matcher(replete("data"))); // "Fresh: data"
 * ```
 *
 * @since 2.0.0
 */
export function match<A, B>(
  onInitial: () => B,
  onPending: () => B,
  onReplete: (a: A) => B,
  onRefresh: (a: A) => B,
): (ua: Datum<A>) => B {
  return (ua) => {
    switch (ua.tag) {
      case "Initial":
        return onInitial();
      case "Pending":
        return onPending();
      case "Refresh":
        return onRefresh(ua.value);
      case "Replete":
        return onReplete(ua.value);
    }
  };
}

/**
 * Get the value from a Datum or return a default.
 *
 * @example
 * ```ts
 * import { getOrElse, initial, replete } from "./datum.ts";
 *
 * const getValue = getOrElse(() => "default");
 * console.log(getValue(initial)); // "default"
 * console.log(getValue(replete("data"))); // "data"
 * ```
 *
 * @since 2.0.0
 */
export function getOrElse<A>(onNone: () => A): (ua: Datum<A>) => A {
  return match(onNone, onNone, identity, identity);
}

/**
 * Wrap a value in a Replete Datum.
 *
 * @example
 * ```ts
 * import { wrap } from "./datum.ts";
 *
 * const datum = wrap(42);
 * console.log(datum); // { tag: "Replete", value: 42 }
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): Datum<A> {
  return replete(a);
}

/**
 * Apply a function to the value in a Datum.
 *
 * @example
 * ```ts
 * import { map, replete, initial } from "./datum.ts";
 * import { pipe } from "./fn.ts";
 *
 * const datum = pipe(
 *   replete(5),
 *   map(n => n * 2)
 * );
 * console.log(datum); // { tag: "Replete", value: 10 }
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Datum<A>) => Datum<I> {
  return match(
    constInitial,
    constPending,
    flow(fai, replete),
    flow(fai, refresh),
  );
}

/**
 * Apply a function wrapped in a Datum to a value wrapped in a Datum.
 *
 * @example
 * ```ts
 * import { apply, replete, initial } from "./datum.ts";
 * import { pipe } from "./fn.ts";
 *
 * const datumFn = replete((n: number) => n * 2);
 * const datumValue = replete(5);
 * const result = pipe(
 *   datumValue,
 *   apply(datumFn)
 * );
 * console.log(result); // { tag: "Replete", value: 10 }
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: Datum<A>,
): <I>(ufai: Datum<(a: A) => I>) => Datum<I> {
  switch (ua.tag) {
    case "Initial":
      return (ufai) => isLoading(ufai) ? pending : initial;
    case "Pending":
      return constPending;
    case "Replete":
      return (ufai) =>
        isReplete(ufai)
          ? replete(ufai.value(ua.value))
          : isRefresh(ufai)
          ? refresh(ufai.value(ua.value))
          : isLoading(ufai)
          ? pending
          : initial;
    case "Refresh":
      return (ufai) => isSome(ufai) ? refresh(ufai.value(ua.value)) : pending;
  }
}

/**
 * Chain Datum computations together.
 *
 * @example
 * ```ts
 * import { flatmap, replete, initial } from "./datum.ts";
 * import { pipe } from "./fn.ts";
 *
 * const datum = pipe(
 *   replete(5),
 *   flatmap(n => replete(n * 2))
 * );
 * console.log(datum); // { tag: "Replete", value: 10 }
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Datum<I>,
): (ta: Datum<A>) => Datum<I> {
  return match(
    constInitial,
    constPending,
    fati,
    flow(fati, toLoading),
  );
}

/**
 * Provide an alternative Datum if the current one has no value.
 *
 * @example
 * ```ts
 * import { alt, initial, replete } from "./datum.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(initial, alt(replete("fallback"))); // Replete("fallback")
 * const result2 = pipe(replete("data"), alt(replete("fallback"))); // Replete("data")
 * ```
 *
 * @since 2.0.0
 */
export function alt<A>(tb: Datum<A>): (ta: Datum<A>) => Datum<A> {
  return (ta) => isSome(ta) ? ta : tb;
}

/**
 * Fold over a Datum to produce a single value.
 *
 * @example
 * ```ts
 * import { fold, initial, replete } from "./datum.ts";
 *
 * const folder = fold(
 *   (acc: number, value: number) => acc + value,
 *   0
 * );
 *
 * console.log(folder(initial)); // 0
 * console.log(folder(replete(5))); // 5
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Datum<A>) => O {
  return (ta) => isSome(ta) ? foao(o, ta.value) : o;
}

/**
 * Check if a Datum satisfies a predicate.
 *
 * @example
 * ```ts
 * import { exists, replete, initial } from "./datum.ts";
 *
 * const isEven = (n: number) => n % 2 === 0;
 * console.log(exists(isEven)(replete(4))); // true
 * console.log(exists(isEven)(replete(3))); // false
 * console.log(exists(isEven)(initial)); // false
 * ```
 *
 * @since 2.0.0
 */
export function exists<A>(predicate: Predicate<A>): (ua: Datum<A>) => boolean {
  return (ua) => isSome(ua) && predicate(ua.value);
}

/**
 * Filter a Datum based on a predicate.
 *
 * @example
 * ```ts
 * import { filter, replete, initial } from "./datum.ts";
 *
 * const isEven = (n: number) => n % 2 === 0;
 * console.log(filter(isEven)(replete(4))); // Replete(4)
 * console.log(filter(isEven)(replete(3))); // Initial
 * console.log(filter(isEven)(initial)); // Initial
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ta: Datum<A>) => Datum<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Datum<A>) => Datum<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Datum<A>) => Datum<A> {
  const _exists = exists(predicate);
  return (ta) => _exists(ta) ? ta : isLoading(ta) ? pending : initial;
}

/**
 * Filter and map a Datum using an Option.
 *
 * @example
 * ```ts
 * import { filterMap, replete, initial } from "./datum.ts";
 * import * as O from "./option.ts";
 *
 * const safeDivide = (n: number) => n === 0 ? O.none : O.some(10 / n);
 * console.log(filterMap(safeDivide)(replete(5))); // Replete(2)
 * console.log(filterMap(safeDivide)(replete(0))); // Initial
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  fai: (a: A) => Option<I>,
): (ua: Datum<A>) => Datum<I> {
  return (ua) => {
    if (isNone(ua)) {
      return ua;
    }
    const oi = fai(ua.value);
    if (isReplete(ua)) {
      return O.isNone(oi) ? initial : replete(oi.value);
    } else {
      return O.isNone(oi) ? pending : refresh(oi.value);
    }
  };
}

/**
 * Partition a Datum based on a predicate.
 *
 * @example
 * ```ts
 * import { partition, replete, initial } from "./datum.ts";
 *
 * const isEven = (n: number) => n % 2 === 0;
 * const [evens, odds] = partition(isEven)(replete(4));
 * console.log(evens); // Replete(4)
 * console.log(odds); // Initial
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: Datum<A>) => Pair<Datum<B>, Datum<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: Datum<A>) => Pair<Datum<A>, Datum<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: Datum<A>) => Pair<Datum<A>, Datum<A>> {
  return (ua) => {
    if (isNone(ua)) {
      return [ua, ua];
    }

    if (predicate(ua.value)) {
      if (isReplete(ua)) {
        return [ua, initial];
      }
      return [ua, pending];
    }

    if (isReplete(ua)) {
      return [initial, ua];
    }
    return [pending, ua];
  };
}

/**
 * Partition and map a Datum using an Either.
 *
 * @example
 * ```ts
 * import { partitionMap, replete, initial } from "./datum.ts";
 * import * as E from "./either.ts";
 *
 * const classify = (n: number) => n % 2 === 0 ? E.right(n) : E.left(n);
 * const [evens, odds] = partitionMap(classify)(replete(4));
 * console.log(evens); // Replete(4)
 * console.log(odds); // Initial
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  fai: (a: A) => Either<J, I>,
): (ua: Datum<A>) => Pair<Datum<I>, Datum<J>> {
  return (ua) => {
    if (isNone(ua)) {
      return [ua, ua];
    }
    const result = fai(ua.value);
    if (isReplete(ua)) {
      return result.tag === "Right"
        ? [replete(result.right), initial]
        : [initial, replete(result.left)];
    } else {
      return result.tag === "Right"
        ? [refresh(result.right), pending]
        : [pending, refresh(result.left)];
    }
  };
}

/**
 * Traverse over a Datum using the supplied Applicable.
 *
 * @example
 * ```ts
 * import { traverse, replete } from "./datum.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const datum = pipe(
 *   replete(5),
 *   traverse(O.ApplicableOption)(n => O.some(n * 2))
 * );
 * console.log(datum); // Some({ tag: "Replete", value: 10 })
 * ```
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicable<V>,
): <A, I, J, K, L, M>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Datum<A>) => $<V, [Datum<I>, J, K], [L], [M]> {
  return (favi) =>
    match(
      () => A.wrap(constInitial()),
      () => A.wrap(constPending()),
      (a) => pipe(favi(a), A.map(replete)),
      (a) => pipe(favi(a), A.map(refresh)),
    );
}

/**
 * Create a Showable instance for Datum given a Showable for the inner type.
 *
 * @example
 * ```ts
 * import { getShowableDatum, replete, initial } from "./datum.ts";
 *
 * const showable = getShowableDatum({ show: (n: number) => n.toString() });
 * console.log(showable.show(replete(42))); // "Replete(42)"
 * console.log(showable.show(initial)); // "Initial"
 * ```
 *
 * @since 2.0.0
 */
export function getShowableDatum<A>({ show }: Showable<A>): Showable<Datum<A>> {
  return ({
    show: match(
      () => `Initial`,
      () => `Pending`,
      (a) => `Replete(${show(a)})`,
      (a) => `Refresh(${show(a)})`,
    ),
  });
}

/**
 * Create a Combinable instance for Datum given a Combinable for the inner type.
 *
 * @example
 * ```ts
 * import { getCombinableDatum, replete } from "./datum.ts";
 * import * as N from "./number.ts";
 *
 * const combinable = getCombinableDatum(N.CombinableNumberSum);
 * const datum1 = replete(2);
 * const datum2 = replete(3);
 * const result = combinable.combine(datum2)(datum1); // Replete(5)
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableDatum<A>(
  S: Combinable<A>,
): Combinable<Datum<A>> {
  return ({
    combine: (second) =>
      match(
        () => second,
        () => toLoading(second),
        (v) =>
          isSome(second)
            ? (isRefresh(second)
              ? refresh(S.combine(second.value)(v))
              : replete(S.combine(second.value)(v)))
            : (isPending(second) ? refresh(v) : replete(v)),
        (v) =>
          isSome(second) ? refresh(S.combine(second.value)(v)) : refresh(v),
      ),
  });
}

/**
 * Create an Initializable instance for Datum given an Initializable for the inner type.
 *
 * @example
 * ```ts
 * import { getInitializableDatum } from "./datum.ts";
 * import * as N from "./number.ts";
 *
 * const initializable = getInitializableDatum(N.InitializableNumberSum);
 * const init = initializable.init(); // Initial
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableDatum<A>(
  S: Initializable<A>,
): Initializable<Datum<A>> {
  return ({
    init: constInitial,
    ...getCombinableDatum(S),
  });
}

/**
 * Create a Comparable instance for Datum given a Comparable for the inner type.
 *
 * @example
 * ```ts
 * import { getComparableDatum, replete, initial } from "./datum.ts";
 * import * as N from "./number.ts";
 *
 * const comparable = getComparableDatum(N.ComparableNumber);
 * const datum1 = replete(5);
 * const datum2 = replete(3);
 * const result = comparable.compare(datum2)(datum1); // false (5 !== 3)
 * ```
 *
 * @since 2.0.0
 */
export function getComparableDatum<A>(S: Comparable<A>): Comparable<Datum<A>> {
  return ({
    compare: (b) =>
      match(
        () => isInitial(b),
        () => isPending(b),
        (v) => isReplete(b) ? S.compare(b.value)(v) : false,
        (v) => isRefresh(b) ? S.compare(b.value)(v) : false,
      ),
  });
}

/**
 * Create a Sortable instance for Datum given a Sortable for the inner type.
 *
 * @example
 * ```ts
 * import { getSortableDatum, replete, initial } from "./datum.ts";
 * import * as N from "./number.ts";
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const sortable = getSortableDatum(N.SortableNumber);
 * const data = [replete(3), initial, replete(1)];
 * const sorted = pipe(
 *   data,
 *   A.sort(sortable)
 * );
 * // [initial, replete(1), replete(3)]
 * ```
 *
 * @since 2.0.0
 */
export function getSortableDatum<A>(O: Sortable<A>): Sortable<Datum<A>> {
  return fromSort((fst, snd) =>
    pipe(
      fst,
      match(
        () => isInitial(snd) ? 0 : -1,
        () => isInitial(snd) ? 1 : isPending(snd) ? 0 : -1,
        (value) =>
          isNone(snd) ? 1 : isReplete(snd) ? O.sort(value, snd.value) : -1,
        (value) => isRefresh(snd) ? O.sort(value, snd.value) : 1,
      ),
    )
  );
}

/**
 * @since 2.0.0
 */
export const ApplicableDatum: Applicable<KindDatum> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const MappableDatum: Mappable<KindDatum> = {
  map,
};

/**
 * @since 2.0.0
 */
export const FlatmappableDatum: Flatmappable<KindDatum> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const TraversableDatum: Traversable<KindDatum> = {
  map,
  fold,
  traverse,
};

/**
 * @since 2.0.0
 */
export const WrappableDatum: Wrappable<KindDatum> = {
  wrap,
};

/**
 * @since 2.0.0
 */
export const FilterableDatum: Filterable<KindDatum> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * @since 2.0.0
 */
export const tap: Tap<KindDatum> = createTap(FlatmappableDatum);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindDatum> = createBind(FlatmappableDatum);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindDatum> = createBindTo(MappableDatum);
