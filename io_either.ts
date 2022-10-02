import type { Alt } from "./alt.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Extend } from "./extend.ts";
import type { Foldable } from "./foldable.ts";
import type { Kind, Out } from "./kind.ts";
import type { MonadThrow } from "./monad.ts";

import * as E from "./either.ts";
import * as I from "./io.ts";
import {
  createApplySemigroup,
  createSequenceStruct,
  createSequenceTuple,
} from "./apply.ts";
import { constant, flow, identity, pipe } from "./fns.ts";

export type IOEither<L, R> = I.IO<E.Either<L, R>>;

export interface URI extends Kind {
  readonly kind: IOEither<Out<this, 1>, Out<this, 0>>;
}

export function left<A = never, B = never>(left: B): IOEither<B, A> {
  return I.of(E.left(left));
}

export function right<A = never, B = never>(right: A): IOEither<B, A> {
  return I.of(E.right(right));
}

export function tryCatch<A = never, B = never>(
  fa: () => A,
  onError: (error: unknown) => B,
): IOEither<B, A> {
  try {
    return right(fa());
  } catch (e) {
    return left(onError(e));
  }
}

export function fromEither<A = never, B = never>(
  ta: E.Either<B, A>,
): IOEither<B, A> {
  return constant(ta);
}

export function fromIO<A = never, B = never>(ta: I.IO<A>): IOEither<B, A> {
  return flow(ta, E.right);
}

export function of<A = never, B = never>(a: A): IOEither<B, A> {
  return right(a);
}

export function throwError<A = never, B = never>(b: B): IOEither<B, A> {
  return left(b);
}

export function ap<A, I, B>(
  tfai: IOEither<B, (a: A) => I>,
): (ta: IOEither<B, A>) => IOEither<B, I> {
  return I.ap(pipe(tfai, I.map(E.ap)));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: IOEither<B, A>) => IOEither<B, I> {
  return I.map(E.map(fai));
}

export function chain<A, I, B>(
  fati: (a: A) => IOEither<B, I>,
): (ta: IOEither<B, A>) => IOEither<B, I> {
  return (ta) => flow(ta, E.fold(E.left, (a) => fati(a)()));
}

export function join<A, B>(ta: IOEither<B, IOEither<B, A>>): IOEither<B, A> {
  return pipe(ta, chain(identity));
}

export function chainLeft<A, B, J>(
  fbtj: (b: B) => IOEither<J, A>,
): (ta: IOEither<B, A>) => IOEither<J, A> {
  return I.chain((e: E.Either<B, A>) => E.isLeft(e) ? fbtj(e.left) : I.of(e));
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: IOEither<B, A>) => IOEither<J, I> {
  return I.map(E.bimap(fbj, fai));
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: IOEither<B, A>) => IOEither<J, A> {
  return I.map(E.mapLeft(fbj));
}

export function alt<A = never, B = never>(
  tb: IOEither<B, A>,
): (ta: IOEither<B, A>) => IOEither<B, A> {
  return (ta) => flow(ta, E.fold(tb, E.right));
}

export function extend<A, I, B>(
  ftai: (ta: IOEither<B, A>) => I,
): (ta: IOEither<B, A>) => IOEither<B, I> {
  return flow(ftai, right);
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: IOEither<B, A>) => O {
  return (ta) => pipe(ta(), E.fold(() => o, (a) => foao(o, a)));
}

export const BifunctorIOEither: Bifunctor<URI> = { bimap, mapLeft };

export const MonadThrowIOEither: MonadThrow<URI> = {
  of,
  ap,
  map,
  join,
  chain,
  throwError,
};

export const AltIOEither: Alt<URI> = { alt, map };

export const ExtendsIOEither: Extend<URI> = { map, extend };

export const FoldableIOEither: Foldable<URI> = { reduce };

export const getApplySemigroup = createApplySemigroup(MonadThrowIOEither);

export const sequenceTuple = createSequenceTuple(MonadThrowIOEither);

export const sequenceStruct = createSequenceStruct(MonadThrowIOEither);
