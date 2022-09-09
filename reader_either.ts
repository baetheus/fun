import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import * as E from "./either.ts";
import * as R from "./reader.ts";
import { flow, handleThrow, identity, pipe } from "./fns.ts";

export type ReaderEither<S extends unknown[], L, R> = R.Reader<
  S,
  E.Either<L, R>
>;

export const URI = "ReaderEither";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReaderEither<_[2], _[1], _[0]>;
  }
}

export function ask<A extends unknown[], B = never>(): ReaderEither<A, B, A> {
  return (...a) => E.right(a);
}

export function asks<A, B = never, C extends unknown[] = []>(
  fca: (...c: C) => A,
): ReaderEither<C, B, A> {
  return flow(fca, E.right);
}

export function left<A = never, B = never, C extends unknown[] = []>(
  left: B,
): ReaderEither<C, B, A> {
  return R.of(E.left(left));
}

export function right<A, B = never, C extends unknown[] = []>(
  right: A,
): ReaderEither<C, B, A> {
  return R.of(E.right(right));
}

export function tryCatch<A, B, C extends unknown[]>(
  fca: (...c: C) => A,
  onThrow: (e: unknown, c: C) => B,
): ReaderEither<C, B, A> {
  return handleThrow(
    fca,
    (a) => E.right(a),
    (e, c) => E.left(onThrow(e, c)),
  );
}

export function fromEither<A, B, C extends unknown[] = []>(
  ta: E.Either<B, A>,
): ReaderEither<C, B, A> {
  return R.of(ta);
}

export function of<A, B = never, C extends unknown[] = []>(
  a: A,
): ReaderEither<C, B, A> {
  return right(a);
}

export function throwError<A = never, B = never, C extends unknown[] = []>(
  b: B,
): ReaderEither<C, B, A> {
  return left(b);
}

export function bimap<A, I, B, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): <C extends unknown[] = []>(
  ta: ReaderEither<C, B, A>,
) => ReaderEither<C, J, I> {
  return (tab) => flow(tab, E.bimap(fbj, fai));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B = never, C extends unknown[] = []>(
  ta: ReaderEither<C, B, A>,
) => ReaderEither<C, B, I> {
  return bimap(identity, fai);
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A = never, C extends unknown[] = []>(
  ta: ReaderEither<C, B, A>,
) => ReaderEither<C, J, A> {
  return bimap(fbj, identity);
}

export function ap<A, I, B, C extends unknown[] = []>(
  tfai: ReaderEither<C, B, (a: A) => I>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, B, I> {
  return (ta) =>
    (...c) => pipe(tfai(...c), E.chain((fai) => pipe(ta(...c), E.map(fai))));
}

export function chain<A, C extends unknown[], I, J>(
  fati: (a: A) => ReaderEither<C, J, I>,
): <B>(ta: ReaderEither<C, B, A>) => ReaderEither<C, B | J, I> {
  return (ta) =>
    (...c) => {
      const e = ta(...c);
      return E.isLeft(e) ? e : fati(e.right)(...c);
    };
}

export function join<A, B, C extends unknown[]>(
  tta: ReaderEither<C, B, ReaderEither<C, B, A>>,
): ReaderEither<C, B, A> {
  return pipe(tta, chain(identity));
}

export function alt<A, B, C extends unknown[]>(
  tb: ReaderEither<C, B, A>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, B, A> {
  return (ta) =>
    (...c) => {
      const e = ta(...c);
      return E.isLeft(e) ? tb(...c) : e;
    };
}

export function chainLeft<A, B, C extends unknown[], J>(
  fbtj: (b: B) => ReaderEither<C, J, A>,
): (ta: ReaderEither<C, B, A>) => ReaderEither<C, J, A> {
  return (ta) => pipe(ta, R.chain(E.fold(fbtj, right)));
}

export function compose<A extends unknown[], I, J>(
  right: ReaderEither<A, J, I>,
): <B, C extends unknown[]>(
  left: ReaderEither<C, B, A>,
) => ReaderEither<C, B | J, I> {
  return (left) => flow(left, E.chain((a) => right(...a)));
}

export function getRightMonad<B>(
  { concat }: T.Semigroup<B>,
): T.MonadThrow<URI, [B, unknown[]]> {
  return ({
    of,
    ap: (tfai) =>
      // deno-lint-ignore no-explicit-any
      (ta): ReaderEither<any, any, any> =>
        (...c) => {
          const efai = tfai(...c);
          const ea = ta(...c);
          return E.isLeft(efai)
            ? (E.isLeft(ea) ? E.left(concat(efai.left)(ea.left)) : efai)
            : (E.isLeft(ea) ? ea : E.right(efai.right(ea.right)));
        },
    map,
    join,
    chain,
    throwError,
  });
}

// deno-lint-ignore no-explicit-any
export const Functor: T.Functor<URI, [any, unknown[]]> = { map };

// deno-lint-ignore no-explicit-any
export const Apply: T.Apply<URI, [any, unknown[]]> = { ap, map };

// deno-lint-ignore no-explicit-any
export const Applicative: T.Applicative<URI, [any, unknown[]]> = {
  of,
  ap,
  map,
};

// deno-lint-ignore no-explicit-any
export const Chain: T.Chain<URI, [any, unknown[]]> = { ap, map, chain };

// deno-lint-ignore no-explicit-any
export const Monad: T.Monad<URI, [any, unknown[]]> = {
  of,
  ap,
  map,
  join,
  chain,
};

// deno-lint-ignore no-explicit-any
export const Bifunctor: T.Bifunctor<URI, [any, unknown[]]> = { bimap, mapLeft };

// deno-lint-ignore no-explicit-any
export const MonadThrow: T.MonadThrow<URI, [any, unknown[]]> = {
  of,
  ap,
  map,
  join,
  chain,
  throwError,
};

// deno-lint-ignore no-explicit-any
export const Alt: T.Alt<URI, [any, unknown[]]> = { alt, map };
