import type { $, Do, Kind, Monad } from "./types.ts";

import { identity, pipe } from "./fns.ts";

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
