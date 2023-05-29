import type { Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";

import { bind as bind_ } from "./chain.ts";
import { bindTo as bindTo_ } from "./functor.ts";

export type Identity<A> = A;

export interface KindIdentity extends Kind {
  readonly kind: Identity<Out<this, 0>>;
}

export function of<A>(a: A): Identity<A> {
  return a;
}

export function map<A, I>(fai: (a: A) => I): (ta: Identity<A>) => Identity<I> {
  return fai;
}

export function ap<A>(
  ua: Identity<A>,
): <I>(ufai: Identity<(a: A) => I>) => Identity<I> {
  return (ufai) => ufai(ua);
}

export function join<A>(ta: Identity<Identity<A>>): Identity<A> {
  return ta;
}

export function chain<A, I>(
  fati: (a: A) => Identity<I>,
): (ta: Identity<A>) => Identity<I> {
  return fati;
}

export const MonadIdentity: Monad<KindIdentity> = { of, ap, map, join, chain };

export const Do = <A>() => of<A>(<A> {});

export const bind = bind_(MonadIdentity);

export const bindTo = bindTo_(MonadIdentity);
