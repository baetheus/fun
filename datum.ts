import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Lazy } from "./types.ts";

import { flow, identity, isNotNil, pipe } from "./fns.ts";
import { createDo } from "./derivations.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Initial = {
  readonly tag: "Initial";
};

export type Pending = {
  readonly tag: "Pending";
};

export type Refresh<A> = {
  readonly tag: "Refresh";
  readonly value: A;
};

export type Replete<A> = {
  readonly tag: "Replete";
  readonly value: A;
};

export type Datum<A> = Initial | Pending | Refresh<A> | Replete<A>;

export type None = Initial | Pending;

export type Some<A> = Refresh<A> | Replete<A>;

export type Loading<A> = Pending | Refresh<A>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Datum";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Datum<_[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const initial: Initial = { tag: "Initial" };

export const pending: Pending = { tag: "Pending" };

export const refresh = <D>(value: D): Datum<D> => ({ tag: "Refresh", value });

export const replete = <D>(value: D): Datum<D> => ({ tag: "Replete", value });

export const constInitial = <A = never>(): Datum<A> => initial;

export const constPending = <A = never>(): Datum<A> => pending;

export const fromNullable = <A>(a: A): Datum<NonNullable<A>> =>
  isNotNil(a) ? replete(a) : initial;

export const tryCatch = <A>(f: Lazy<A>): Datum<A> => {
  try {
    return replete(f());
  } catch (_) {
    return initial;
  }
};

/*******************************************************************************
 * Combinators
 ******************************************************************************/

export const toLoading = <A>(ta: Datum<A>): Datum<A> =>
  pipe(
    ta,
    fold(
      constPending,
      constPending,
      refresh,
      refresh,
    ),
  );

/*******************************************************************************
 * Guards
 ******************************************************************************/

export const isInitial = <A>(ta: Datum<A>): ta is Initial =>
  ta.tag === "Initial";

export const isPending = <A>(ta: Datum<A>): ta is Pending =>
  ta.tag === "Pending";

export const isRefresh = <A>(ta: Datum<A>): ta is Refresh<A> =>
  ta.tag === "Refresh";

export const isReplete = <A>(ta: Datum<A>): ta is Replete<A> =>
  ta.tag === "Replete";

export const isNone = <A>(ta: Datum<A>): ta is None =>
  isInitial(ta) || isPending(ta);

export const isSome = <A>(ta: Datum<A>): ta is Some<A> =>
  isRefresh(ta) || isReplete(ta);

export const isLoading = <A>(ta: Datum<A>): ta is Loading<A> =>
  isPending(ta) || isRefresh(ta);

/*******************************************************************************
 * Destructors
 ******************************************************************************/

export const fold = <A, B>(
  onInitial: () => B,
  onPending: () => B,
  onReplete: (a: A) => B,
  onRefresh: (a: A) => B,
) =>
  (ma: Datum<A>): B => {
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

export const getOrElse = <A>(onNone: Lazy<A>) =>
  fold<A, A>(onNone, onNone, identity, identity);

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <A>({ show }: TC.Show<A>): TC.Show<Datum<A>> => ({
  show: fold(
    () => `Initial`,
    () => `Pending`,
    (a) => `Replete(${show(a)})`,
    (a) => `Refresh(${show(a)})`,
  ),
});

export const getSemigroup = <A>(
  S: TC.Semigroup<A>,
): TC.Semigroup<Datum<A>> => ({
  concat: (mx) =>
    fold(
      () => mx,
      () => toLoading(mx),
      (v) =>
        isSome(mx)
          ? (isRefresh(mx)
            ? refresh(S.concat(mx.value)(v))
            : replete(S.concat(mx.value)(v)))
          : (isPending(mx) ? refresh(v) : replete(v)),
      (v) => isSome(mx) ? refresh(S.concat(mx.value)(v)) : refresh(v),
    ),
});

export const getMonoid = <A>(S: TC.Semigroup<A>): TC.Monoid<Datum<A>> => ({
  ...getSemigroup(S),
  empty: () => initial,
});

export const getSetoid = <A>(S: TC.Setoid<A>): TC.Setoid<Datum<A>> => ({
  equals: (a) =>
    (b) =>
      a === b ||
      (a.tag === b.tag &&
        (isSome(a) && isSome(b) ? S.equals(a.value)(b.value) : true)),
});

export const getOrd = <A>(O: TC.Ord<A>): TC.Ord<Datum<A>> => {
  const { equals } = getSetoid(O);
  return {
    equals,
    lte: (ta) =>
      fold(
        () => isInitial(ta),
        () => isNone(ta),
        (v) => isNone(ta) ? true : isRefresh(ta) ? false : O.lte(ta.value)(v),
        (v) => isNone(ta) ? true : isReplete(ta) ? true : O.lte(ta.value)(v),
      ),
  };
};

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) =>
    fold(
      constInitial,
      constPending,
      flow(fab, replete),
      flow(fab, refresh),
    ),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) => {
      if (isSome(tfab) && isSome(ta)) {
        const result = tfab.value(ta.value);
        if (isLoading(tfab) || isLoading(ta)) {
          return refresh(result);
        }
        return replete(result);
      }
      return isLoading(tfab) || isLoading(ta) ? pending : initial;
    },
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: replete,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fati) =>
    fold(
      constInitial,
      constPending,
      fati,
      flow(fati, toLoading),
    ),
};

export const Monad: TC.Monad<URI> = {
  of: replete,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const Alternative: TC.Alternative<URI> = {
  of: Applicative.of,
  ap: Monad.ap,
  map: Functor.map,
  zero: constInitial,
  alt: (tb) => (ta) => (isSome(ta) ? ta : tb),
};

export const Foldable: TC.Foldable<URI> = {
  reduce: (faba, a) => (tb) => (isSome(tb) ? faba(a, tb.value) : a),
};

export const Traversable: TC.Traversable<URI> = {
  map: Functor.map,
  reduce: Foldable.reduce,
  traverse: (A) =>
    (faub) =>
      fold(
        () => A.of(constInitial()),
        () => A.of(constPending()),
        flow(faub, A.map(replete)),
        flow(faub, A.map(refresh)),
      ),
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const { reduce, traverse } = Traversable;

/*******************************************************************************
 * Do Notation
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
