import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import * as E from "./either.ts";
import * as R from "./reader.ts";
import { createDo } from "./derivations.ts";
import { flow, identity, pipe } from "./fns.ts";

export type ReaderEither<S, L, R> = R.Reader<S, E.Either<L, R>>;

export const URI = "ReaderEither";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReaderEither<_[2], _[1], _[0]>;
  }
}

export function ask<A, B = never>(): ReaderEither<A, B, A> {
  return E.right;
}

export function asks<A, B = never, C = unknown>(
  fca: (c: C) => A,
): ReaderEither<C, B, A> {
  return flow(fca, E.right);
}

export function left<A = never, B = never, C = unknown>(
  left: B,
): ReaderEither<C, B, A> {
  return R.of(E.left(left));
}

export function right<A, B = never, C = unknown>(
  right: A,
): ReaderEither<C, B, A> {
  return R.of(E.right(right));
}

export function tryCatch<A, B, C = unknown>(
  fa: () => A,
  onError: (e: unknown) => B,
): ReaderEither<C, B, A> {
  try {
    return R.of(E.right(fa()));
  } catch (e) {
    return R.of(E.left(onError(e)));
  }
}

export function fromEither<A, B, C = unknown>(
  ta: E.Either<B, A>,
): ReaderEither<C, B, A> {
  return R.of(ta);
}

export function of<A, B = never, C = unknown>(a: A): ReaderEither<C, B, A> {
  return right(a);
}

export function throwError<A = never, B = never, C = never>(
  b: B,
): ReaderEither<C, B, A> {
  return left(b);
}

export function bimap<A, I, B, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): <C = never>(ta: ReaderEither<C, B, A>) => ReaderEither<C, J, I> {
  return (tab) => flow(tab, E.bimap(fbj, fai));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B = never, C = never>(ta: ReaderEither<C, B, A>) => ReaderEither<C, B, I> {
  return bimap(identity, fai);
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A = never, C = never>(ta: ReaderEither<C, B, A>) => ReaderEither<C, J, A> {
  return bimap(fbj, identity);
}

export function ap<A, I, B, C>(
  tfai: ReaderEither<C, B, (a: A) => I>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, B, I> {
  return (ta) => (c) =>
    pipe(tfai(c), E.chain((fai) => pipe(ta(c), E.map(fai))));
}

export function chain<A, B, C, I>(
  fati: (a: A) => ReaderEither<C, B, I>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, B, I> {
  return (ta) => (c) => {
    const e = ta(c);
    return E.isLeft(e) ? e : fati(e.right)(c);
  };
}

export function join<A, B, C>(
  tta: ReaderEither<C, B, ReaderEither<C, B, A>>,
): ReaderEither<C, B, A> {
  return pipe(tta, chain(identity));
}

export function alt<A, B, C>(
  tb: ReaderEither<C, B, A>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, B, A> {
  return (ta) => (c) => {
    const e = ta(c);
    return E.isLeft(e) ? tb(c) : e;
  };
}

export function chainLeft<A, B, C, J>(
  fbtj: (b: B) => ReaderEither<C, J, A>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, J, A> {
  return (ta) => pipe(ta, R.chain(E.fold(fbtj, right)));
}

export function compose<Y, Z, B>(
  tb: ReaderEither<Y, B, Z>,
): <X>(ta: ReaderEither<X, B, Y>) => ReaderEither<X, B, Z> {
  return (ta) => flow(ta, E.chain(tb));
}

export function widen<F>(): <R, E, A>(
  ta: ReaderEither<R, E, A>,
) => ReaderEither<R, E | F, A> {
  return identity;
}

export function getRightMonad<B>(
  { concat }: T.Semigroup<B>,
): T.MonadThrow<URI, [B]> {
  return ({
    of,
    ap: (tfai) =>
    // deno-lint-ignore no-explicit-any
    (ta): ReaderEither<any, any, any> =>
    (c) => {
      const efai = tfai(c);
      const ea = ta(c);
      return E.isLeft(efai)
        ? (E.isLeft(ea) ? E.left(concat(efai.left)(ea.left)) : efai)
        : (E.isLeft(ea) ? ea : E.right(efai.right(ea.right)));
    },
    map,
    join,
    chain,
    throwError,
  });
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const Bifunctor: T.Bifunctor<URI> = { bimap, mapLeft };

export const MonadThrow: T.MonadThrow<URI> = {
  of,
  ap,
  map,
  join,
  chain,
  throwError,
};

export const Alt: T.Alt<URI> = { alt, map };

export const { Do, bind, bindTo } = createDo(Monad);
