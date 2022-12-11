import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Profunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#profunctor
 *
 * TODO: Strong, Choice, Star, Join, and Split
 */
export interface Profunctor<U extends Kind> extends TypeClass<U> {
  readonly dimap: <A, I, L, D>(
    fld: (l: L) => D,
    fai: (a: A) => I,
  ) => <B, C, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [L], [E]>;
}

// // TODO: fanout and splitStrong
// export interface Strong<U extends Kind> extends TypeClass<U>, Profunctor<U> {
//   readonly first: <A, B, C, D, E, Q = never>(
//     ua: $<U, [A, B, C], [D], [E]>,
//   ) => $<U, [Pair<A, Q>, B, C], [Pair<D, Q>], [E]>;
//   readonly second: <A, B, C, D, E, Q = never>(
//     ua: $<U, [A, B, C], [D], [E]>,
//   ) => $<U, [Pair<Q, A>, B, C], [Pair<Q, D>], [E]>;
// }

// // TODO: fanin and splitChoice
// export interface Choice<U extends Kind> extends TypeClass<U>, Profunctor<U> {
//   readonly left: <A, B, C, D, E, Q = never>(
//     ua: $<U, [A, B, C], [D], [E]>,
//   ) => $<U, [Either<A, Q>, B, C], [Either<D, Q>], [E]>;
//   readonly right: <A, B, C, D, E, Q = never>(
//     ua: $<U, [A, B, C], [D], [E]>,
//   ) => $<U, [Either<Q, A>, B, C], [Either<Q, D>], [E]>;
// }
