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
import type { Filterable } from "./filterable.ts";
import type { Mappable } from "./mappable.ts";
import type { Wrappable } from "./wrappable.ts";
import type { Comparable } from "./comparable.ts";
import type { Either } from "./either.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";

import * as O from "./option.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { fromSort } from "./sortable.ts";
import { isNotNil } from "./nil.ts";
import { flow, handleThrow, identity, pipe } from "./fn.ts";

/**
 * @since 2.0.0
 */
export type Initial = {
  readonly tag: "Initial";
};

/**
 * @since 2.0.0
 */
export type Pending = {
  readonly tag: "Pending";
};

/**
 * @since 2.0.0
 */
export type Refresh<A> = {
  readonly tag: "Refresh";
  readonly value: A;
};

/**
 * @since 2.0.0
 */
export type Replete<A> = {
  readonly tag: "Replete";
  readonly value: A;
};

/**
 * @since 2.0.0
 */
export type Datum<A> = Initial | Pending | Refresh<A> | Replete<A>;

/**
 * @since 2.0.0
 */
export type None = Initial | Pending;

/**
 * @since 2.0.0
 */
export type Some<A> = Refresh<A> | Replete<A>;

/**
 * @since 2.0.0
 */
export type Loading<A> = Pending | Refresh<A>;

/**
 * @since 2.0.0
 */
export interface KindDatum extends Kind {
  readonly kind: Datum<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export const initial: Initial = { tag: "Initial" };

/**
 * @since 2.0.0
 */
export const pending: Pending = { tag: "Pending" };

/**
 * @since 2.0.0
 */
export function refresh<D>(value: D): Datum<D> {
  return ({ tag: "Refresh", value });
}

/**
 * @since 2.0.0
 */
export function replete<D>(value: D): Datum<D> {
  return ({ tag: "Replete", value });
}

/**
 * @since 2.0.0
 */
export function constInitial<A = never>(): Datum<A> {
  return initial;
}

/**
 * @since 2.0.0
 */
export function constPending<A = never>(): Datum<A> {
  return pending;
}

/**
 * @since 2.0.0
 */
export function fromNullable<A>(a: A): Datum<NonNullable<A>> {
  return isNotNil(a) ? replete(a) : initial;
}

/**
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
 * @since 2.0.0
 */
export function isInitial<A>(ta: Datum<A>): ta is Initial {
  return ta.tag === "Initial";
}

/**
 * @since 2.0.0
 */
export function isPending<A>(ta: Datum<A>): ta is Pending {
  return ta.tag === "Pending";
}

/**
 * @since 2.0.0
 */
export function isRefresh<A>(ta: Datum<A>): ta is Refresh<A> {
  return ta.tag === "Refresh";
}

/**
 * @since 2.0.0
 */
export function isReplete<A>(ta: Datum<A>): ta is Replete<A> {
  return ta.tag === "Replete";
}

/**
 * @since 2.0.0
 */
export function isNone<A>(ta: Datum<A>): ta is None {
  return isInitial(ta) || isPending(ta);
}

/**
 * @since 2.0.0
 */
export function isSome<A>(ta: Datum<A>): ta is Some<A> {
  return isRefresh(ta) || isReplete(ta);
}

/**
 * @since 2.0.0
 */
export function isLoading<A>(ta: Datum<A>): ta is Loading<A> {
  return isPending(ta) || isRefresh(ta);
}

/**
 * @since 2.0.0
 */
export function match<A, B>(
  onInitial: () => B,
  onPending: () => B,
  onReplete: (a: A) => B,
  onRefresh: (a: A) => B,
) {
  return (ma: Datum<A>): B => {
    switch (ma.tag) {
      case "Initial":
        return onInitial();
      case "Pending":
        return onPending();
      case "Refresh":
        return onRefresh(ma.value);
      case "Replete":
        return onReplete(ma.value);
    }
  };
}

/**
 * @since 2.0.0
 */
export function getOrElse<A>(onNone: () => A) {
  return match<A, A>(onNone, onNone, identity, identity);
}

/**
 * @since 2.0.0
 */
export function wrap<A>(a: A): Datum<A> {
  return replete(a);
}

/**
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
 * @since 2.0.0
 */
export function alt<A>(tb: Datum<A>): (ta: Datum<A>) => Datum<A> {
  return (ta) => isSome(ta) ? ta : tb;
}

/**
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Datum<A>) => O {
  return (ta) => isSome(ta) ? foao(o, ta.value) : o;
}

/**
 * @since 2.0.0
 */
export function exists<A>(predicate: Predicate<A>): (ua: Datum<A>) => boolean {
  return (ua) => isSome(ua) && predicate(ua.value);
}

/**
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
export const tap = createTap(FlatmappableDatum);

/**
 * @since 2.0.0
 */
export const bind = createBind(FlatmappableDatum);

/**
 * @since 2.0.0
 */
export const bindTo = createBindTo(MappableDatum);
