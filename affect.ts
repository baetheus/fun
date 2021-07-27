import type * as TC from "./type_classes.ts";
import type * as HKT from "./hkt.ts";
import type { Reader } from "./reader.ts";
import type { Either } from "./either.ts";
import type { Option } from "./option.ts";
import type { Task } from "./task.ts";
import type { TaskEither } from "./task_either.ts";
import type { IO } from "./io.ts";
import type { IOEither } from "./io_either.ts";

import * as E from "./either.ts";
import { createDo } from "./derivations.ts";
import { flow, identity, pipe, resolve, then } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

/**
 * The Affect type can best be thought of as an asynchronous function that
 * returns an `Either`. ie. `async (r: R) => Promise<Either<E, A>>`. This
 * forms the basis of most Promise based asynchronous communication in
 * TypeScript.
 */
export type Affect<R, E, A> = Reader<R, Promise<Either<E, A>>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

/**
 * URI constant for Affect
 */
export const URI = "Affect";

/**
 * URI constant type for Affect
 */
export type URI = typeof URI;

/**
 * Kind declaration for Affect
 */
declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Affect<_[2], _[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

/**
 * A thunk that takes a type level value. Like Reader.ask this function is
 * used to set type constraints on a value without supplying a value.
 *
 *       const p1 = ask<number>();
 *       const p2 = p1(1); // Promise(Right(1))
 */
export function ask<R, L = never>(): Affect<R, L, R> {
  return flow(E.right, resolve);
}

/**
 * A thunk that takes a type level value. Like Reader.ask this function is
 * used to set type constraints on a value without supplying a value.
 *
 *       const p1 = ask<number>();
 *       const p2 = p1(1); // Promise(Left(1))
 */
export function askLeft<L, R = never>(): Affect<L, L, R> {
  return flow(E.left, resolve);
}

/**
 * Constructs an Affect from an asynchronous computation
 *
 *       const p1 = asks((n: URL) => fetch(n))
 *       const p2 = p1(1); // Promise(Right(Response))
 */
export function asks<R, E = never, A = never>(
  fra: (r: R) => Promise<A>,
): Affect<R, E, A> {
  return flow(fra, then(E.right));
}

/**
 * Constructs an Affect from an asynchronous computation
 *
 *       const p1 = asks((n: URL) => fetch(n))
 *       const p2 = p1(1); // Promise(Left(Response))
 */
export function asksLeft<R, E = never, A = never>(
  fre: (r: R) => Promise<E>,
): Affect<R, E, A> {
  return flow(fre, then(E.left));
}

/**
 * Constructs an Affect from a value
 *
 *       const p1 = right(1) // (n: never) => Promise(Right(1))
 */
export function right<R = never, E = never, A = never>(
  right: A,
): Affect<R, E, A> {
  return () => resolve(E.right(right));
}

/**
 * Constructs an Affect from a value
 *
 *       const p1 = left(1) // (n: never) => Promise(Left(1))
 */
export function left<R = never, E = never, A = never>(
  left: E,
): Affect<R, E, A> {
  return () => resolve(E.left(left));
}

/**
 * Constructs an Affect from an Option
 */
export function fromOption<E = never>(
  onNone: () => E,
): (<R = never, A = never>(ma: Option<A>) => Affect<R, E, A>) {
  return (ma) => ma.tag === "None" ? left(onNone()) : right(ma.value);
}

/**
 * Constructs an Affect from an Either
 */
export function fromEither<R = never, E = never, A = never>(
  ma: Either<E, A>,
): Affect<R, E, A> {
  return () => resolve(ma);
}

/**
 * Constructs an Affect from a Task
 */
export function fromTask<R = never, E = never, A = never>(
  ma: Task<A>,
): Affect<R, E, A> {
  return flow(ma, then(E.right));
}

/**
 * Constructs an Affect from a TaskEither
 */
export function fromTaskEither<R = never, E = never, A = never>(
  ma: TaskEither<E, A>,
): Affect<R, E, A> {
  return ma;
}

/**
 * Constructs an Affect from an IO
 */
export function fromIO<R = never, E = never, A = never>(
  ma: IO<A>,
): Affect<R, E, A> {
  return flow(ma, E.right, resolve);
}

/**
 * Constructs an Affect from an IOEither
 */
export function fromIOEither<R = never, E = never, A = never>(
  ma: IOEither<E, A>,
): Affect<R, E, A> {
  return flow(ma, resolve);
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function map<A, I>(
  fai: (a: A) => I,
): (<R, E>(ta: Affect<R, E, A>) => Affect<R, E, I>) {
  return (ta) => flow(ta, then(E.map(fai)));
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (<R>(ta: Affect<R, B, A>) => Affect<R, J, I>) {
  return (ta) => flow(ta, then(E.bimap(fbj, fai)));
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): (<R, A>(ta: Affect<R, B, A>) => Affect<R, J, A>) {
  return (ta) => flow(ta, then(E.mapLeft(fbj)));
}

export function ap<R, E, A, I>(
  tfai: Affect<R, E, (a: A) => I>,
): ((ta: Affect<R, E, A>) => Affect<R, E, I>) {
  return (ta) =>
    async (r) => {
      const efai = await tfai(r);
      const ea = await ta(r);
      return pipe(ea, E.ap(efai));
    };
}

export function chain<R, E, A, I>(
  fati: (a: A) => Affect<R, E, I>,
): ((ta: Affect<R, E, A>) => Affect<R, E, I>) {
  return (ta) =>
    async (r) => {
      const ea = await ta(r);
      return E.isLeft(ea) ? ea : fati(ea.right)(r);
    };
}

export function join<R, E, A>(
  ta: Affect<R, E, Affect<R, E, A>>,
): Affect<R, E, A> {
  return pipe(ta, chain(identity));
}

export function compose<E = never, A = never, B = never>(
  aeb: Affect<A, E, B>,
): (<R>(rea: Affect<R, E, A>) => Affect<R, E, B>) {
  return (rea) =>
    async (r) => {
      const ea = await rea(r);
      return E.isLeft(ea) ? ea : await aeb(ea.right);
    };
}

export function recover<E, A>(
  fea: (e: E) => A,
): (<R>(ta: Affect<R, E, A>) => Affect<R, E, A>) {
  return (ta) => flow(ta, then(E.fold(flow(fea, E.right), E.right)));
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Bifunctor: TC.Bifunctor<URI> = { bimap, mapLeft };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of: right, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of: right, ap, map, join, chain };

export const MonadThrow: TC.MonadThrow<URI> = {
  of: right,
  ap,
  map,
  join,
  chain,
  throwError: left,
};

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
