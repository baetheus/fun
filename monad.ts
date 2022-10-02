import type { $, Kind, TypeClass } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Chain } from "./chain.ts";

import { identity, pipe } from "./fns.ts";

/**
 * Monad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#monad
 *
 * Here we extend Monad with a join function. Other names for join
 * are flatten or flat.
 */
export interface Monad<U extends Kind>
  extends Applicative<U>, Chain<U>, TypeClass<U> {
  readonly join: <A, B, C, D, E>(
    tta: $<U, [$<U, [A, B, C], [D], [E]>, B, C], [D], [E]>,
  ) => $<U, [A, B, C], [D], [E]>;
}

/**
 * MonadThrow
 * https://github.com/gcanti/fp-ts/blob/master/src/MonadThrow.ts
 */
export interface MonadThrow<U extends Kind> extends Monad<U> {
  readonly throwError: <A, B, C, D, E>(b: B) => $<U, [A, B, C], [D], [E]>;
}

/**
 * Do notation
 * @experimental
 */
export interface Do<U extends Kind> extends TypeClass<U> {
  Do: <B = never, C = never, D = never, E = never>() => $<
    U,
    // deno-lint-ignore ban-types
    [{}, B, C],
    [D],
    [E]
  >;
  bind: <
    N extends string,
    A,
    I,
    B = never,
    C = never,
    D = never,
    E = never,
  >(
    name: Exclude<N, keyof A>,
    fati: (a: A) => $<U, [I, B, C], [D], [E]>,
  ) => (ta: $<U, [A, B, C], [D], [E]>) => $<
    U,
    [
      A & { readonly [K in N]: I },
      B,
      C,
    ],
    [D],
    [E]
  >;
  bindTo: <N extends string>(
    name: N,
  ) => <A, B = never, C = never, D = never, E = never>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [{ [K in N]: A }, B, C], [D], [E]>;
}
/**
 * Derive Monad module from of and chain
 *
 * TODO: rename to fromOfAndChain
 * TODO: add another
 *
 * @experimental
 */
export function createMonad<U extends Kind>(
  { of, chain }: Pick<Monad<U>, "of" | "chain">,
): Monad<U> {
  const Monad: Monad<U> = {
    of,
    ap: (tfai) => (ta) => pipe(tfai, chain((fab) => pipe(ta, Monad.map(fab)))),
    map: (fai) => (ta) => pipe(ta, chain((a) => of(fai(a)))),
    chain,
    join: chain(identity),
  };
  return Monad;
}

/**
 * Derive Do notation from Monad
 *
 * @experimental
 */
export function createDo<U extends Kind>(
  M: Monad<U>,
): Do<U> {
  return {
    Do: () => M.of({}),
    bind: <N extends string, A, I, B, C, D, E>(
      name: Exclude<N, keyof A>,
      fati: (a: A) => $<U, [I, B, C], [D], [E]>,
    ): (
      ta: $<U, [A, B, C], [D], [E]>,
    ) => $<U, [A & { readonly [K in N]: I }, B, C], [D], [E]> =>
      M.chain((a: A) =>
        pipe(
          fati(a),
          M.map((i) => ({ ...a, [name as N]: i })),
        ) as $<U, [A & { readonly [K in N]: I }, B, C], [D], [E]>
      ),
    bindTo: <N extends string>(name: N) =>
    <A, B, C, D, E>(
      ta: $<U, [A, B, C], [D], [E]>,
    ): $<U, [{ readonly [K in N]: A }, B, C], [D], [E]> =>
      pipe(ta, M.map((a) => ({ [name]: a }))) as $<
        U,
        [{ readonly [K in N]: A }, B, C],
        [D],
        [E]
      >,
  };
}
