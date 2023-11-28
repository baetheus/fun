// deno-lint-ignore-file no-explicit-any
//
import type { $, Hold, In, Kind, Out } from "../kind.ts";
import type { Pair } from "../pair.ts";
import type { Mappable } from "../mappable.ts";

import * as O from "../option.ts";
import * as F from "../fn.ts";
import * as P from "../pair.ts";
import { flow, pipe, todo } from "../fn.ts";

export interface Profunctor<U extends Kind> {
  readonly dimap: <D, L, A, I, B = never, C = never, E = unknown>(
    fld: (l: L) => D,
    fai: (a: A) => I,
  ) => (ua: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [L], [E]>;
}

export interface Forget<R, A, B> extends Hold<B> {
  readonly runForget: (a: A) => R;
}

export interface KindForget extends Kind {
  readonly kind: Forget<Out<this, 1>, In<this, 0>, Out<this, 0>>;
}

export const ProfunctorForget: Profunctor<KindForget> = {
  dimap: (fld, _fai) => (ua) => ({
    runForget: flow(fld, ua.runForget),
  }),
};

export interface Star<U extends Kind, X, A> {
  readonly runStar: <B = never, C = never, D = unknown, E = unknown>(
    x: X,
  ) => $<U, [A, B, C], [D], [E]>;
}

export interface KindStar<U extends Kind> extends Kind {
  readonly kind: Star<U, In<this, 0>, Out<this, 0>>;
}

export function profunctorStar<U extends Kind>(
  M: Mappable<U>,
): Profunctor<KindStar<U>> {
  return {
    dimap: (fld, fai) => (ua) => ({
      // This should work but we need to do some type spelunking
      runStar: (flow(fld, ua.runStar, M.map(fai))) as any,
    }),
  };
}

export interface Strong<U extends Kind> extends Profunctor<U> {
  readonly first: <
    A,
    X = never,
    B = never,
    C = never,
    D = unknown,
    E = unknown,
  >(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [Pair<A, X>, B, C], [Pair<D, X>], [E]>;
  readonly second: <
    A,
    X = never,
    B = never,
    C = never,
    D = unknown,
    E = unknown,
  >(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [Pair<X, A>, B, C], [Pair<X, D>], [E]>;
}

export function strong<U extends Kind>({ dimap }: Profunctor<U>): Strong<U> {
  return {
    dimap,
    first: dimap(P.getFirst, (a) => P.pair(a, null as any)),
    second: dimap(P.getSecond, (a) => P.pair(null as any, a)),
  };
}

export const ProfunctorStarFn: Profunctor<KindStar<F.KindFn>> = profunctorStar(
  F.MappableFn,
);
export const StrongStarFn: Strong<KindStar<F.KindFn>> = strong(
  ProfunctorStarFn,
);

// Hmm
