import type { $, Kind } from "./kind.ts";
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
export interface Monad<U extends Kind> extends Applicative<U>, Chain<U> {
  readonly join: <A, B, C, D>(
    tta: $<U, [$<U, [A, B, C, D]>, B, C, D]>,
  ) => $<U, [A, B, C, D]>;
}

/**
 * MonadThrow
 * https://github.com/gcanti/fp-ts/blob/master/src/MonadThrow.ts
 */
export interface MonadThrow<U extends Kind> extends Monad<U> {
  readonly throwError: <A, B, C, D>(b: B) => $<U, [A, B, C, D]>;
}

/**
 * Derive Monad module from of and chain
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

// Following is an initial implementation of Do notation that is incomplete

// export type Do<U extends Kind> = <B = never, C = never, D = never>() => $<
//   U,
//   // deno-lint-ignore ban-types
//   [{}, B, C, D]
// >;

// export type Bind<U extends Kind> = <
//   N extends string,
//   A,
//   I,
//   B = never,
//   C = never,
//   D = never,
// >(
//   name: Exclude<N, keyof A>,
//   fati: (a: A) => $<U, [I, B, C, D]>,
// ) => (ta: $<U, [A, B, C, D]>) => $<
//   U,
//   [
//     { readonly [K in keyof A | N]: K extends keyof A ? A[K] : I },
//     B,
//     C,
//     D,
//   ]
// >;

// export type BindTo<U extends Kind> = <N extends string>(
//   name: N,
// ) => <A, B = never, C = never, D = never>(
//   ta: $<U, [A, B, C, D]>,
// ) => $<U, [{ [K in N]: A }, B, C, D]>;

// function makeDo<U extends Kind>(M: T.Monad<U>): Do<U> {
//   return () => M.of({});
// }

// function makeBind<U extends Kind>(M: T.Monad<U>): Bind<U> {
//   return (name, fati) =>
//     M.chain((a) => {
//       const ti = fati(a);
//       // deno-lint-ignore no-explicit-any
//       return pipe(ti, M.map((i) => Object.assign({}, a, { [name]: i }))) as any;
//     });
// }

// function makeBindTo<U extends Kind>(M: T.Monad<U>): BindTo<U> {
//   // deno-lint-ignore no-explicit-any
//   return (name) => M.map((a) => ({ [name]: a })) as any;
// }

// export function createDo<U extends Kind>(
//   M: T.Monad<U>,
// ) {
//   return {
//     Do: makeDo(M),
//     bind: makeBind(M),
//     bindTo: makeBindTo(M),
//   };
// }
