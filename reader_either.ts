import type { In, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Monad, MonadThrow } from "./monad.ts";
import type { Semigroup } from "./semigroup.ts";

import * as E from "./either.ts";
import * as R from "./reader.ts";
import { flow, handleThrow, identity, pipe } from "./fns.ts";

export type ReaderEither<S, L, R> = R.Reader<
  S,
  E.Either<L, R>
>;

export interface URI extends Kind {
  readonly kind: ReaderEither<In<this, 0>, Out<this, 1>, Out<this, 0>>;
}

export interface RightURI<B> extends Kind {
  readonly kind: ReaderEither<In<this, 0>, B, Out<this, 0>>;
}

export function ask<A, B = never>(): ReaderEither<A, B, A> {
  return E.right;
}

export function asks<A, B = never, C = never>(
  fca: (c: C) => A,
): ReaderEither<C, B, A> {
  return flow(fca, E.right);
}

export function left<A = never, B = never, C = never>(
  left: B,
): ReaderEither<C, B, A> {
  return R.of(E.left(left));
}

export function right<A, B = never, C = never>(
  right: A,
): ReaderEither<C, B, A> {
  return R.of(E.right(right));
}

export function tryCatch<A, B, C>(
  fca: (c: C) => A,
  onThrow: (e: unknown, c: C) => B,
): ReaderEither<C, B, A> {
  return handleThrow(
    fca,
    (a) => E.right(a),
    (e, [c]) => E.left(onThrow(e, c)),
  );
}

export function fromEither<A, B, C = never>(
  ta: E.Either<B, A>,
): ReaderEither<C, B, A> {
  return R.of(ta);
}

export function of<A, B = never, C = never>(
  a: A,
): ReaderEither<C, B, A> {
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
): <C = never>(
  ta: ReaderEither<C, B, A>,
) => ReaderEither<C, J, I> {
  return (tab) => flow(tab, E.bimap(fbj, fai));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B = never, C = never>(
  ta: ReaderEither<C, B, A>,
) => ReaderEither<C, B, I> {
  return bimap(identity, fai);
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A = never, C = never>(
  ta: ReaderEither<C, B, A>,
) => ReaderEither<C, J, A> {
  return bimap(fbj, identity);
}

// TODO: Decide if this should be lazy over tfai
export function ap<A, I, B, C = never>(
  tfai: ReaderEither<C, B, (a: A) => I>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, B, I> {
  return (ta) => (c) => pipe(ta(c), E.ap(tfai(c)));
}

export function chain<A, C, I, J>(
  fati: (a: A) => ReaderEither<C, J, I>,
): <B>(ta: ReaderEither<C, B, A>) => ReaderEither<C, B | J, I> {
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

export function compose<A, I, J>(
  right: ReaderEither<A, J, I>,
): <B, C>(
  left: ReaderEither<C, B, A>,
) => ReaderEither<C, B | J, I> {
  return (left) => flow(left, E.chain((a) => right(a)));
}

export function getRightMonad<B>(
  { concat }: Semigroup<B>,
): Monad<RightURI<B>> {
  return ({
    of,
    ap: (tfai) => (ta) => (c) => {
      const efai = tfai(c);
      const ea = ta(c);
      return E.isLeft(efai)
        ? (E.isLeft(ea) ? E.left(concat(efai.left)(ea.left)) : efai)
        : (E.isLeft(ea) ? ea : E.right(efai.right(ea.right)));
    },
    map,
    join,
    chain,
  });
}

export const BifunctorReaderEither: Bifunctor<URI> = { bimap, mapLeft };

export const MonadThrowReaderEither: MonadThrow<URI> = {
  of,
  ap,
  map,
  join,
  chain,
  throwError,
};

export const AltReaderEither: Alt<URI> = { alt, map };
