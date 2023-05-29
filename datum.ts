import type { $, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Applicative } from "./applicative.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Ord } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import { fromCompare } from "./ord.ts";
import { isNotNil } from "./nilable.ts";
import { flow, identity, pipe } from "./fn.ts";
import { bind as bind_ } from "./chain.ts";
import { bindTo as bindTo_ } from "./functor.ts";

/**
 * TODO: Lets get a monoid in here for tracking progress.
 */

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

export interface KindDatum extends Kind {
  readonly kind: Datum<Out<this, 0>>;
}

export const initial: Initial = { tag: "Initial" };

export const pending: Pending = { tag: "Pending" };

export function refresh<D>(value: D): Datum<D> {
  return { tag: "Refresh", value };
}

export function replete<D>(value: D): Datum<D> {
  return { tag: "Replete", value };
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

export function toLoading<A>(ta: Datum<A>): Datum<A> {
  return pipe(ta, match(constPending, constPending, refresh, refresh));
}

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

export function getOrElse<A>(onNone: () => A) {
  return match<A, A>(onNone, onNone, identity, identity);
}

export function of<A>(a: A): Datum<A> {
  return replete(a);
}

export function throwError<A = never>(): Datum<A> {
  return initial;
}

export function map<A, I>(fai: (a: A) => I): (ta: Datum<A>) => Datum<I> {
  return match(
    constInitial,
    constPending,
    flow(fai, replete),
    flow(fai, refresh),
  );
}

export function ap<A>(ua: Datum<A>): <I>(ufai: Datum<(a: A) => I>) => Datum<I> {
  switch (ua.tag) {
    case "Initial":
      return (ufai) => (isLoading(ufai) ? pending : initial);
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
      return (ufai) => (isSome(ufai) ? refresh(ufai.value(ua.value)) : pending);
  }
}

export function chain<A, I>(
  fati: (a: A) => Datum<I>,
): (ta: Datum<A>) => Datum<I> {
  return match(constInitial, constPending, fati, flow(fati, toLoading));
}

export function join<A>(taa: Datum<Datum<A>>): Datum<A> {
  return pipe(taa, chain(identity));
}

export function alt<A>(tb: Datum<A>): (ta: Datum<A>) => Datum<A> {
  return (ta) => (isSome(ta) ? ta : tb);
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Datum<A>) => O {
  return (ta) => (isSome(ta) ? foao(o, ta.value) : o);
}

export function traverse<V extends Kind>(
  A: Applicative<V>,
): <A, I, J, K, L, M>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Datum<A>) => $<V, [Datum<I>, J, K], [L], [M]> {
  return (favi) =>
    match(
      () => A.of(constInitial()),
      () => A.of(constPending()),
      (a) =>
        pipe(
          favi(a),
          A.map((i) => replete(i)),
        ),
      (a) =>
        pipe(
          favi(a),
          A.map((i) => refresh(i)),
        ),
    );
}

export function getShow<A>({ show }: Show<A>): Show<Datum<A>> {
  return {
    show: match(
      () => `Initial`,
      () => `Pending`,
      (a) => `Replete(${show(a)})`,
      (a) => `Refresh(${show(a)})`,
    ),
  };
}

export function getSemigroup<A>(S: Semigroup<A>): Semigroup<Datum<A>> {
  return {
    concat: (mx) =>
      match(
        () => mx,
        () => toLoading(mx),
        (v) =>
          isSome(mx)
            ? isRefresh(mx)
              ? refresh(S.concat(mx.value)(v))
              : replete(S.concat(mx.value)(v))
            : isPending(mx)
            ? refresh(v)
            : replete(v),
        (v) => (isSome(mx) ? refresh(S.concat(mx.value)(v)) : refresh(v)),
      ),
  };
}

export function getMonoid<A>(S: Semigroup<A>): Monoid<Datum<A>> {
  return {
    ...getSemigroup(S),
    empty: constInitial,
  };
}

export function getEq<A>(S: Eq<A>): Eq<Datum<A>> {
  return {
    equals: (b) =>
      match(
        () => isInitial(b),
        () => isPending(b),
        (v) => (isReplete(b) ? S.equals(b.value)(v) : false),
        (v) => (isRefresh(b) ? S.equals(b.value)(v) : false),
      ),
  };
}

export function getOrd<A>(O: Ord<A>): Ord<Datum<A>> {
  return fromCompare((fst, snd) =>
    pipe(
      fst,
      match(
        () => (isInitial(snd) ? 0 : -1),
        () => (isInitial(snd) ? 1 : isPending(snd) ? 0 : -1),
        (value) =>
          isNone(snd) ? 1 : isReplete(snd) ? O.compare(value, snd.value) : -1,
        (value) => (isRefresh(snd) ? O.compare(value, snd.value) : 1),
      ),
    )
  );
}

export const MonadDatum: Monad<KindDatum> = { of, ap, map, join, chain };

export const AltDatum: Alt<KindDatum> = { alt, map };

export const TraversableDatum: Traversable<KindDatum> = {
  map,
  reduce,
  traverse,
};

export const Do = <A>() => of<A>(<A> {});

export const bind = bind_(MonadDatum);

export const bindTo = bindTo_(MonadDatum);
