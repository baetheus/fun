import type { $, Kind, TypeClass } from "./kind.ts";
import type { Functor } from "./functor.ts";

/**
 * Apply
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#apply
 */
export interface Apply<U extends Kind> extends Functor<U>, TypeClass<U> {
  readonly ap: <A, B = never, C = never, D = unknown, E = unknown>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => <I, J = never, K = never>(
    tfai: $<U, [(value: A) => I, J, K], [D], [E]>,
  ) => $<U, [I, B | J, C | K], [D], [E]>;
}

// export function createApplySemigroup<U extends Kind>(
//   A: Apply<U>,
// ): <A, B = never, C = never, D = unknown, E = unknown>(
//   S: Semigroup<A>,
// ) => Semigroup<$<U, [A, B, C], [E], [D]>> {
//   return (S) => ({
//     concat: (second) => (first) => pipe(first, A.map(S.concat), A.ap(second)),
//   });
// }
