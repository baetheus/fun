import type { In, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Monad, MonadThrow } from "./monad.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Profunctor, Strong } from "./profunctor.ts";
import type { Pair } from "./pair.ts";
import type { Fn } from "./fn.ts";

import * as E from "./either.ts";
import * as P from "./pair.ts";
import * as F from "./fn.ts";

export type FnEither<D extends unknown[], B, A> = Fn<D, E.Either<B, A>>;

export interface URI extends Kind {
  readonly kind: FnEither<[In<this, 0>], Out<this, 1>, Out<this, 0>>;
}

export interface RightURI<B> extends Kind {
  readonly kind: FnEither<[In<this, 0>], B, Out<this, 0>>;
}

export function ask<A, B = never>(): FnEither<[A], B, A> {
  return E.right;
}

export function asks<D extends unknown[], A>(
  ua: Fn<D, A>,
): FnEither<D, never, A> {
  return F.flow(ua, E.right);
}

export function left<B, D extends unknown[] = never[], A = never>(
  left: B,
): FnEither<D, B, A> {
  return F.of(E.left(left));
}

export function right<A, D extends unknown[] = never[], B = never>(
  right: A,
): FnEither<D, B, A> {
  return F.of(E.right(right));
}

export function tryCatch<D extends unknown[], B, A>(
  ua: Fn<D, A>,
  onThrow: (e: unknown, d: D) => B,
): FnEither<D, B, A> {
  return F.handleThrow(
    ua,
    (a) => E.right(a),
    (e, d) => E.left(onThrow(e, d)),
  );
}

export function fromEither<A, B, D extends unknown[] = never[]>(
  ua: E.Either<B, A>,
): FnEither<D, B, A> {
  return F.of(ua);
}

export function of<A, B = never, D extends unknown[] = never[]>(
  a: A,
): FnEither<D, B, A> {
  return right(a);
}

export function throwError<A = never, B = never, D extends unknown[] = never[]>(
  b: B,
): FnEither<D, B, A> {
  return left(b);
}

export function bimap<A, I, B, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): <D extends unknown[] = never[]>(
  ua: FnEither<D, B, A>,
) => FnEither<D, J, I> {
  return (uab) => F.flow(uab, E.bimap(fbj, fai));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B = never, D extends unknown[] = never[]>(
  ua: FnEither<D, B, A>,
) => FnEither<D, B, I> {
  return bimap(F.identity, fai);
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A = never, D extends unknown[] = never[]>(
  ua: FnEither<D, B, A>,
) => FnEither<D, J, A> {
  return bimap(fbj, F.identity);
}

export function ap<A, I, B, D extends unknown[] = never[]>(
  tfai: FnEither<D, B, (a: A) => I>,
): (ua: FnEither<D, B, A>) => FnEither<D, B, I> {
  return (ua) => (...d) => F.pipe(ua(...d), E.ap(tfai(...d)));
}

export function chain<A, D extends unknown[], I, J>(
  fati: (a: A) => FnEither<D, J, I>,
): <B>(ua: FnEither<D, B, A>) => FnEither<D, B | J, I> {
  return (ua) => (...d) => {
    const e = ua(...d);
    return E.isLeft(e) ? e : fati(e.right)(...d);
  };
}

export function join<A, B, D extends unknown[]>(
  tua: FnEither<D, B, FnEither<D, B, A>>,
): FnEither<D, B, A> {
  return F.pipe(tua, chain(F.identity));
}

export function alt<A, B, D extends unknown[]>(
  ub: FnEither<D, B, A>,
): (ua: FnEither<D, B, A>) => FnEither<D, B, A> {
  return (ua) => (...d) => {
    const e = ua(...d);
    return E.isLeft(e) ? ub(...d) : e;
  };
}

export function chainLeft<A, B, D extends unknown[], J>(
  fbtj: (b: B) => FnEither<D, J, A>,
): (ua: FnEither<D, B, A>) => FnEither<D, J, A> {
  return (ua) => F.pipe(ua, F.chain(E.fold(fbtj, right)));
}

export function contramap<L, D>(
  fld: (l: L) => D,
): <A, B>(ua: FnEither<[D], B, A>) => FnEither<[L], B, A> {
  return (ua) => F.flow(fld, ua);
}

export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
): <B>(ua: FnEither<[D], B, A>) => FnEither<[L], B, I> {
  return F.flow(contramap(fld), map(fai));
}

export function first<A, B, D, Q = never>(
  ua: FnEither<[D], B, A>,
): FnEither<[Pair<D, Q>], B, Pair<A, Q>> {
  return ([d, q]) => F.pipe(ua(d), E.map(P.fromSecond(q)));
}

export function second<A, B, D, Q = never>(
  ua: FnEither<[D], B, A>,
): FnEither<[Pair<Q, D>], B, Pair<Q, A>> {
  return ([q, d]) => F.pipe(ua(d), E.map(P.fromFirst(q)));
}

export function compose<A, I, J>(
  right: FnEither<[A], J, I>,
): <B, D extends unknown[]>(
  left: FnEither<D, B, A>,
) => FnEither<D, B | J, I> {
  return (left) => F.flow(left, E.chain(right));
}

export function getRightMonad<B>(
  { concat }: Semigroup<B>,
): Monad<RightURI<B>> {
  return ({
    of,
    ap: (tfai) => (ua) => (c) => {
      const efai = tfai(c);
      const ea = ua(c);
      return E.isLeft(efai)
        ? (E.isLeft(ea) ? E.left(concat(efai.left)(ea.left)) : efai)
        : (E.isLeft(ea) ? ea : E.right(efai.right(ea.right)));
    },
    map,
    join,
    chain,
  });
}

export const BifunctorFnEither: Bifunctor<URI> = { bimap, mapLeft };

export const MonadFnEither: Monad<URI> = { of, ap, map, join, chain };

export const MonadThrowFnEither: MonadThrow<URI> = {
  of,
  ap,
  map,
  join,
  chain,
  throwError,
};

export const AltFnEither: Alt<URI> = { alt, map };

export const ContravariantFnEither: Contravariant<URI> = { contramap };

export const ProfunctorFnEither: Profunctor<URI> = { dimap };

export const StrongFnEither: Strong<URI> = { dimap, first, second };
