import type { $, Kind, TypeClass } from "./kind.ts";
import type { Pair } from "./pair.ts";
import type { Either } from "./either.ts";

/**
 * Profunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#profunctor
 *
 * TODO: Star, Join, and Split?
 */
export interface Profunctor<U extends Kind> extends TypeClass<U> {
  readonly dimap: <A, I, L, D>(
    fld: (l: L) => D,
    fai: (a: A) => I,
  ) => <B, C, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [L], [E]>;
}

// TODO: fanout and splitStrong
export interface Strong<U extends Kind> extends TypeClass<U>, Profunctor<U> {
  readonly first: <A, B, C, D, E, Q = never>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [Pair<A, Q>, B, C], [Pair<D, Q>], [E]>;
  readonly second: <A, B, C, D, E, Q = never>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [Pair<Q, A>, B, C], [Pair<Q, D>], [E]>;
}

// TODO: fanin and splitChoice
export interface Choice<U extends Kind> extends TypeClass<U>, Profunctor<U> {
  readonly left: <A, B, C, D, E, Q = never>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [Either<A, Q>, B, C], [Either<D, Q>], [E]>;
  readonly right: <A, B, C, D, E, Q = never>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [Either<Q, A>, B, C], [Either<Q, D>], [E]>;
}

// TODO: decide if there is space for this in fun
export interface Costrong<U extends Kind> extends TypeClass<U>, Profunctor<U> {
  readonly unfirst: <A, B, C, D, E, Q = never>(
    ua: $<U, [Pair<A, Q>, B, C], [Pair<D, Q>], [E]>,
  ) => $<U, [A, B, C], [D], [E]>;
  readonly unsecond: <A, B, C, D, E, Q = never>(
    ua: $<U, [Pair<Q, A>, B, C], [Pair<Q, D>], [E]>,
  ) => $<U, [A, B, C], [D], [E]>;
}

// TODO: decide if there is space for this in fun
export interface Cochoice<U extends Kind> extends TypeClass<U>, Profunctor<U> {
  readonly unleft: <A, B, C, D, E, Q = never>(
    ua: $<U, [Either<A, Q>, B, C], [Either<D, Q>], [E]>,
  ) => $<U, [A, B, C], [D], [E]>;
  readonly unright: <A, B, C, D, E, Q = never>(
    ua: $<U, [Either<Q, A>, B, C], [Either<Q, D>], [E]>,
  ) => $<U, [A, B, C], [D], [E]>;
}

// TODO: decide if there is space for this in fun
export interface Closed<U extends Kind> extends TypeClass<U>, Profunctor<U> {
  readonly closed: <A, B, C, D, E, Q = never>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [(q: Q) => A, B, C], [(q: Q) => D], [E]>;
}
