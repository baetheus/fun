import type * as HKT from "./hkt.ts";
import type { Kind, URIS } from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { apply, constant, flow, identity, isNotNil, pipe } from "./fns.ts";
import { createDo } from "./derivations.ts";
import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";

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

export function refresh<D>(value: D): Datum<D> {
  return ({ tag: "Refresh", value });
}

export function replete<D>(value: D): Datum<D> {
  return ({ tag: "Replete", value });
}

export function constInitial<A = never>(): Datum<A> {
  return initial;
}

export function constPending<A = never>(): Datum<A> {
  return pending;
}

export function fromNullable<A>(a: A): Datum<NonNullable<A>> {
  return isNotNil(a) ? replete(a) : initial;
}

export function tryCatch<A>(fa: () => A): Datum<A> {
  try {
    return replete(fa());
  } catch (_) {
    return initial;
  }
}

/*******************************************************************************
 * Combinators
 ******************************************************************************/

export function toLoading<A>(ta: Datum<A>): Datum<A> {
  return pipe(
    ta,
    fold(
      constPending,
      constPending,
      refresh,
      refresh,
    ),
  );
}

/*******************************************************************************
 * Guards
 ******************************************************************************/

export function isInitial<A>(ta: Datum<A>): ta is Initial {
  return ta.tag === "Initial";
}

export function isPending<A>(ta: Datum<A>): ta is Pending {
  return ta.tag === "Pending";
}

export function isRefresh<A>(ta: Datum<A>): ta is Refresh<A> {
  return ta.tag === "Refresh";
}

export function isReplete<A>(ta: Datum<A>): ta is Replete<A> {
  return ta.tag === "Replete";
}

export function isNone<A>(ta: Datum<A>): ta is None {
  return isInitial(ta) || isPending(ta);
}

export function isSome<A>(ta: Datum<A>): ta is Some<A> {
  return isRefresh(ta) || isReplete(ta);
}

export function isLoading<A>(ta: Datum<A>): ta is Loading<A> {
  return isPending(ta) || isRefresh(ta);
}

/*******************************************************************************
 * Destructors
 ******************************************************************************/

export function fold<A, B>(
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

export function getOrElse<A>(onNone: () => A) {
  return fold<A, A>(onNone, onNone, identity, identity);
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A>(a: A): Datum<A> {
  return replete(a);
}

export function map<A, I>(fai: (a: A) => I): ((ta: Datum<A>) => Datum<I>) {
  return fold(
    constInitial,
    constPending,
    flow(fai, replete),
    flow(fai, refresh),
  );
}

export function chain<A, I>(
  fati: (a: A) => Datum<I>,
): ((ta: Datum<A>) => Datum<I>) {
  return fold(
    constInitial,
    constPending,
    fati,
    flow(fati, toLoading),
  );
}

export function ap<A, I>(
  tfai: Datum<(a: A) => I>,
): ((ta: Datum<A>) => Datum<I>) {
  return (ta) => pipe(tfai, chain(flow(map, apply(ta))));
}

export function join<A>(taa: Datum<Datum<A>>): Datum<A> {
  return pipe(taa, chain(identity));
}

export function alt<A>(tb: Datum<A>): ((ta: Datum<A>) => Datum<A>) {
  return (ta) => isSome(ta) ? ta : tb;
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): ((ta: Datum<A>) => O) {
  return (ta) => isSome(ta) ? foao(o, ta.value) : o;
}

export function traverse<VRI extends URIS>(A: TC.Applicative<VRI>) {
  return <A, I, J, K, L>(
    favi: (a: A) => Kind<VRI, [I, J, K, L]>,
  ): ((ta: Datum<A>) => Kind<VRI, [Datum<I>, J, K, L]>) =>
    fold(
      flow(constInitial, A.of),
      flow(constPending, A.of),
      flow(favi, A.map(replete)),
      flow(favi, A.map(refresh)),
    );
}

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export function getShow<A>({ show }: TC.Show<A>): TC.Show<Datum<A>> {
  return ({
    show: fold(
      () => `Initial`,
      () => `Pending`,
      (a) => `Replete(${show(a)})`,
      (a) => `Refresh(${show(a)})`,
    ),
  });
}

export function getSemigroup<A>(
  S: TC.Semigroup<A>,
): TC.Semigroup<Datum<A>> {
  return ({
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
}

export function getMonoid<A>(S: TC.Semigroup<A>): TC.Monoid<Datum<A>> {
  return ({
    ...getSemigroup(S),
    empty: constInitial,
  });
}

export function getSetoid<A>(S: TC.Setoid<A>): TC.Setoid<Datum<A>> {
  return ({
    equals: (a) =>
      (b) => {
        if (a === b) {
          return true;
        }
        if (a.tag === b.tag) {
          if (isSome(a) && isSome(b)) {
            return S.equals(a.value)(b.value);
          }
          return true;
        }
        return false;
      },
  });
}

export function getOrd<A>(O: TC.Ord<A>): TC.Ord<Datum<A>> {
  return ({
    ...getSetoid(O),
    lte: (ta) =>
      fold(
        () => isInitial(ta),
        () => isNone(ta),
        (v) => isNone(ta) ? true : isRefresh(ta) ? false : O.lte(ta.value)(v),
        (v) => isNone(ta) ? true : isReplete(ta) ? true : O.lte(ta.value)(v),
      ),
  });
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

export const Alternative: TC.Alternative<URI> = {
  of,
  ap,
  map,
  zero: constInitial,
  alt,
};

export const Foldable: TC.Foldable<URI> = { reduce };

export const Traversable: TC.Traversable<URI> = { map, reduce, traverse };

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
