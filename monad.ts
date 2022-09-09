// deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
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
export interface Monad<URI extends URIS, _ extends any[] = any[]>
  extends Applicative<URI, _>, Chain<URI, _> {
  readonly join: <A, B extends _[0], C extends _[1], D extends _[2]>(
    tta: Kind<URI, [Kind<URI, [A, B, C, D]>, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}

/**
 * MonadThrow
 * https://github.com/gcanti/fp-ts/blob/master/src/MonadThrow.ts
 */
export interface MonadThrow<URI extends URIS, _ extends any[] = any[]>
  extends Monad<URI, _> {
  readonly throwError: <A, B extends _[0], C extends _[1], D extends _[2]>(
    b: B,
  ) => Kind<URI, [A, B, C, D]>;
}

/**
 * Derive Monad module from of and chain
 */
export function createMonad<URI extends URIS, _ extends any[] = any[]>(
  { of, chain }: Pick<Monad<URI, _>, "of" | "chain">,
): Monad<URI, _> {
  const Monad: Monad<URI, _> = {
    of,
    ap: (tfai) => (ta) => pipe(tfai, chain((fab) => pipe(ta, Monad.map(fab)))),
    map: (fai) => (ta) => pipe(ta, chain((a) => of(fai(a)))),
    chain,
    join: chain(identity),
  };
  return Monad;
}

// Following is an initial implementation of Do notation that is incomplete

// export type Do<URI extends URIS> = <B = never, C = never, D = never>() => Kind<
//   URI,
//   // deno-lint-ignore ban-types
//   [{}, B, C, D]
// >;

// export type Bind<URI extends URIS> = <
//   N extends string,
//   A,
//   I,
//   B = never,
//   C = never,
//   D = never,
// >(
//   name: Exclude<N, keyof A>,
//   fati: (a: A) => Kind<URI, [I, B, C, D]>,
// ) => (ta: Kind<URI, [A, B, C, D]>) => Kind<
//   URI,
//   [
//     { readonly [K in keyof A | N]: K extends keyof A ? A[K] : I },
//     B,
//     C,
//     D,
//   ]
// >;

// export type BindTo<URI extends URIS> = <N extends string>(
//   name: N,
// ) => <A, B = never, C = never, D = never>(
//   ta: Kind<URI, [A, B, C, D]>,
// ) => Kind<URI, [{ [K in N]: A }, B, C, D]>;

// function makeDo<URI extends URIS>(M: T.Monad<URI>): Do<URI> {
//   return () => M.of({});
// }

// function makeBind<URI extends URIS>(M: T.Monad<URI>): Bind<URI> {
//   return (name, fati) =>
//     M.chain((a) => {
//       const ti = fati(a);
//       // deno-lint-ignore no-explicit-any
//       return pipe(ti, M.map((i) => Object.assign({}, a, { [name]: i }))) as any;
//     });
// }

// function makeBindTo<URI extends URIS>(M: T.Monad<URI>): BindTo<URI> {
//   // deno-lint-ignore no-explicit-any
//   return (name) => M.map((a) => ({ [name]: a })) as any;
// }

// export function createDo<URI extends URIS>(
//   M: T.Monad<URI>,
// ) {
//   return {
//     Do: makeDo(M),
//     bind: makeBind(M),
//     bindTo: makeBindTo(M),
//   };
// }
