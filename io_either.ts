import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import * as E from "./either.ts";
import * as I from "./io.ts";
import * as S from "./sequence.ts";
import { createDo } from "./derivations.ts";
import { apply, constant, flow, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type IOEither<L, R> = I.IO<E.Either<L, R>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "IOEither";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: IOEither<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

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

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A = never, B = never>(a: A): IOEither<B, A> {
  return right(a);
}

export function throwError<A = never, B = never>(b: B): IOEither<B, A> {
  return left(b);
}

export function ap<A, I, B>(
  tfai: IOEither<B, (a: A) => I>,
): ((ta: IOEither<B, A>) => IOEither<B, I>) {
  return I.ap(pipe(tfai, I.map(E.ap)));
}

export function map<A, I>(
  fai: (a: A) => I,
): (<B>(ta: IOEither<B, A>) => IOEither<B, I>) {
  return I.map(E.map(fai));
}

export function join<A, B>(ta: IOEither<B, IOEither<B, A>>): IOEither<B, A> {
  return flow(ta, E.chain(apply()));
}

export function chain<A, I, B>(
  fati: (a: A) => IOEither<B, I>,
): ((ta: IOEither<B, A>) => IOEither<B, I>) {
  return (ta) => flow(ta, E.fold(E.left, (a) => fati(a)()));
}

export function chainLeft<A, B, J>(
  fbtj: (b: B) => IOEither<J, A>,
): ((ta: IOEither<B, A>) => IOEither<J, A>) {
  return I.chain((e: E.Either<B, A>) => E.isLeft(e) ? fbtj(e.left) : I.of(e));
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): ((ta: IOEither<B, A>) => IOEither<J, I>) {
  return I.map(E.bimap(fbj, fai));
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): (<A>(ta: IOEither<B, A>) => IOEither<J, A>) {
  return I.map(E.mapLeft(fbj));
}

export function alt<A = never, B = never>(
  tb: IOEither<B, A>,
): ((ta: IOEither<B, A>) => IOEither<B, A>) {
  return (ta) => flow(ta, E.fold(tb, E.right));
}

export function extend<A, I, B>(
  ftai: (ta: IOEither<B, A>) => I,
): ((ta: IOEither<B, A>) => IOEither<B, I>) {
  return flow(ftai, right);
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (<B>(ta: IOEither<B, A>) => O) {
  return (ta) => pipe(ta(), E.fold(() => o, (a) => foao(o, a)));
}

export function widen<J>(): (<A, B>(ta: IOEither<B, A>) => IOEither<B | J, A>) {
  return identity;
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

export const Bifunctor: TC.Bifunctor<URI> = { bimap, mapLeft };

export const MonadThrow: TC.MonadThrow<URI> = { ...Monad, throwError };

export const Alt: TC.Alt<URI> = { alt, map };

export const Extends: TC.Extend<URI> = { map, extend };

export const Foldable: TC.Foldable<URI> = { reduce };

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const sequenceTuple = S.createSequenceTuple(Apply);

export const sequenceStruct = S.createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
