import type { $, Kind, TypeClass } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Chain } from "./chain.ts";

import { pipe } from "./fn.ts";

/**
 * A Monad<T> is an algebra with a notion of join(aka flatten or flat) for
 * a given algebraic data type T. A Monad<T> must also extend Functor<T>,
 * Apply<T>, Applicative<T>, and Chain<T>. This means a Monad<T> has
 * the following methods: of, ap, map, join, and chain. An intuition for
 * Monad can be found by thinking about how Promise.then handles functions
 * that return a new Promise.
 *
 * An instance of a Monad must obey the following laws:
 *
 * 1. Left identity: chain(f)(of(a)) === f(a)
 * 2. Right identity: chain(of)(ua) === ua
 *
 * The original type came from [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#monad)
 *
 * @since 2.0.0
 */
export interface Monad<U extends Kind>
  extends Applicative<U>, Chain<U>, TypeClass<U> {
  readonly join: <
    A,
    B = never,
    C = never,
    D = unknown,
    E = unknown,
    J = never,
    K = never,
  >(
    tta: $<U, [$<U, [A, B, C], [D], [E]>, J, K], [D], [E]>,
  ) => $<U, [A, B | J, C | K], [D], [E]>;
}

/**
 * Derive a Monad instance from of, chain, and a Kind URI. This is
 * the simplest way to get a Monad instance when one has a
 * creation function (of) and a chain function (aka flatMap or
 * bind).
 *
 * @example
 * ```ts
 * import type { Kind, Out } from "./kind.ts";
 * import { createMonad } from "./monad.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Create a URI for Promise<A>
 * interface URI extends Kind {
 *   readonly kind: Promise<Out<this, 0>>;
 * };
 *
 * // Create an of and chain function for Promise<A>
 * const of = <A>(a: A): Promise<A> => Promise.resolve(a);
 * const chain = <A, I>(faui: (a: A) => Promise<I>) =>
 *   (ua: Promise<A>): Promise<I> => ua.then(faui);
 *
 * // Derive a Monad for Promise
 * const M = createMonad<URI>({ of, chain });
 *
 * const result = await pipe(
 *   M.of((n: number) => (m: number) => n + m),
 *   M.ap(M.of(1)),
 *   M.ap(M.of(1)),
 * ); // 2
 * ```
 *
 * @experimental
 *
 * @since 2.0.0
 */
export function createMonad<U extends Kind>(
  { of, chain }: Pick<Monad<U>, "of" | "chain">,
): Monad<U> {
  const Monad: Monad<U> = {
    of,
    ap: (ua) => (ufai) => pipe(ufai, chain((fab) => pipe(ua, Monad.map(fab)))),
    map: (fai) => (ta) => pipe(ta, chain((a) => of(fai(a)))),
    chain,
    join: (uua) => pipe(uua, chain((ua) => ua)),
  };
  return Monad;
}
