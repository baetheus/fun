import type * as T from "./types.ts";
import type { Kind, URIS } from "./kind.ts";

import { identity, pipe } from "./fns.ts";

/**
 * Derive Monad module from of and chain
 */
export function createMonad<URI extends URIS>(
  { of, chain }: Pick<T.Monad<URI>, "of" | "chain">,
): T.Monad<URI> {
  const Monad: T.Monad<URI> = {
    of,
    ap: (tfai) => (ta) => pipe(tfai, chain((fab) => pipe(ta, Monad.map(fab)))),
    map: (fai) => (ta) => pipe(ta, chain((a) => of(fai(a)))),
    chain,
    join: chain(identity),
  };
  return Monad;
}

export function createDo<URI extends URIS>(
  M: T.Monad<URI>,
) {
  return ({
    // deno-lint-ignore ban-types
    Do: <B = never, C = never, D = never>() => M.of<{}, B, C, D>({}),
    bindTo: <N extends string>(
      name: N,
    ): <A, B, C, D>(
      ta: Kind<URI, [A, B, C, D]>,
    ) => Kind<URI, [{ [K in N]: A }, B, C, D]> =>
      // deno-lint-ignore no-explicit-any
      M.map((a: any): any => ({ [name]: a })),
    bind: <N extends string, A, I, B, C, D>(
      name: Exclude<N, keyof A>,
      fati: (a: A) => Kind<URI, [I, B, C, D]>,
    ): (
      ma: Kind<URI, [A, B, C, D]>,
    ) => Kind<
      URI,
      [{ readonly [K in keyof A | N]: K extends keyof A ? A[K] : I }, B, C, D]
    > =>
      // deno-lint-ignore no-explicit-any
      M.chain((a: any): any =>
        // deno-lint-ignore no-explicit-any
        pipe(a, fati, M.map((b: any): any => ({ ...a, [name]: b })))
      ),
  });
}

export function createApplySemigroup<URI extends URIS>(A: T.Apply<URI>) {
  return <A, B = never, C = never, D = never>(
    S: T.Semigroup<A>,
  ): T.Semigroup<Kind<URI, [A, B, C, D]>> => ({
    concat: (a) => A.ap(pipe(a, A.map(S.concat))),
  });
}
