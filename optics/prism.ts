import type * as TC from "../type_classes.ts";
import type { Kind, URIS } from "../hkt.ts";
import type { Predicate, Refinement } from "../types.ts";

import type { Iso } from "./iso.ts";
import type { Lens } from "./lens.ts";
import type { Optional } from "./optional.ts";
import type { Traversal } from "./traversal.ts";

import { fromTraversable } from "./from_traversable.ts";

import * as O from "../option.ts";
import * as E from "../either.ts";
import { apply, constant, flow, identity, pipe } from "../fns.ts";

import { atRecord } from "./at.ts";
import { indexArray, indexRecord } from "./index.ts";
import { id as lensId, prop as lensProp, props as lensProps } from "./lens.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Prism<S, A> = {
  readonly getOption: (s: S) => O.Option<A>;
  readonly reverseGet: (a: A) => S;
};

export type From<T> = T extends Prism<infer S, infer _> ? S : never;

export type To<T> = T extends Prism<infer _, infer A> ? A : never;

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const make = <S, A>(
  getOption: (s: S) => O.Option<A>,
  reverseGet: (a: A) => S,
): Prism<S, A> => ({
  getOption,
  reverseGet,
});

type FromPredicate = {
  <S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>;
  <A>(predicate: Predicate<A>): Prism<A, A>;
};

export const fromPredicate: FromPredicate = <A>(
  predicate: Predicate<A>,
): Prism<A, A> => ({
  getOption: O.fromPredicate(predicate),
  reverseGet: identity,
});

/*******************************************************************************
 * Converters
 ******************************************************************************/

export const asOptional = <S, A>(sa: Prism<S, A>): Optional<S, A> => ({
  getOption: sa.getOption,
  set: getSet(sa),
});

export const asTraversal = <S, A>(sa: Prism<S, A>): Traversal<S, A> => ({
  traverse: (T) =>
    (fata) =>
      (s) =>
        pipe(
          sa.getOption(s),
          O.fold(
            () => T.of(s),
            flow(fata, T.map(flow(getSet(sa), apply(s)))),
          ),
        ),
});

export const fromNullable = <S, A>(
  sa: Prism<S, A>,
): Prism<S, NonNullable<A>> => ({
  getOption: flow(sa.getOption, O.chain(O.fromNullable)),
  reverseGet: sa.reverseGet,
});

/*******************************************************************************
 * Pipeable Compose
 ******************************************************************************/

export const id = <A>(): Prism<A, A> => ({
  getOption: O.some,
  reverseGet: identity,
});

export const compose = <J, K>(jk: Prism<J, K>) =>
  <I>(ij: Prism<I, J>): Prism<I, K> => ({
    getOption: flow(ij.getOption, O.chain(jk.getOption)),
    reverseGet: flow(jk.reverseGet, ij.reverseGet),
  });

export const composeIso = <A, B>(ab: Iso<A, B>) =>
  <S>(sa: Prism<S, A>): Prism<S, B> => ({
    getOption: flow(sa.getOption, O.map(ab.get)),
    reverseGet: flow(ab.reverseGet, sa.reverseGet),
  });

export const composeLens = <A, B>(ab: Lens<A, B>) =>
  <S>(sa: Prism<S, A>): Optional<S, B> => ({
    getOption: flow(sa.getOption, O.map(ab.get)),
    set: (b) =>
      (s) =>
        pipe(
          sa.getOption(s),
          O.fold(() => s, flow(ab.set(b), sa.reverseGet)),
        ),
  });

export const composeOptional = <A, B>(ab: Optional<A, B>) =>
  <S>(sa: Prism<S, A>): Optional<S, B> => ({
    getOption: flow(sa.getOption, O.chain(ab.getOption)),
    set: (b) =>
      (s) =>
        pipe(
          sa.getOption(s),
          O.fold(() => s, flow(ab.set(b), sa.reverseGet)),
        ),
  });

export const composeTraversal = <A, B>(ab: Traversal<A, B>) =>
  <S>(sa: Prism<S, A>): Traversal<S, B> => ({
    traverse: (A) =>
      (fata) =>
        (s) =>
          pipe(
            sa.getOption(s),
            O.fold(
              constant(A.of(s)),
              flow(ab.traverse(A)(fata), A.map(sa.reverseGet)),
            ),
          ),
  });

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

type FilterFn = {
  <A, B extends A>(refinement: Refinement<A, B>): <S>(
    sa: Prism<S, A>,
  ) => Prism<S, B>;
  <A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A>;
};

export const filter: FilterFn = <A>(predicate: Predicate<A>) =>
  <S>(sa: Prism<S, A>): Prism<S, A> => ({
    getOption: flow(sa.getOption, O.chain(O.fromPredicate(predicate))),
    reverseGet: sa.reverseGet,
  });

export const traverse = <URI extends URIS>(T: TC.Traversable<URI>) => {
  const _traversal = fromTraversable(T);
  return <S, A, B = never, C = never, D = never>(
    sa: Prism<S, Kind<URI, [A, B, C, D]>>,
  ): Traversal<S, A> =>
    pipe(
      sa,
      composeTraversal(_traversal<A, B, C, D>()),
    );
};

export const modify = <A>(f: (a: A) => A) =>
  <S>(sa: Prism<S, A>) =>
    (s: S): S =>
      pipe(
        sa.getOption(s),
        O.map((a) => {
          const na = f(a);
          return na === a ? s : sa.reverseGet(na);
        }),
        O.getOrElse(() => s),
      );

export const getSet = <S, A>(sa: Prism<S, A>) =>
  (a: A) => pipe(sa, modify(constant(a)));

export const prop = <A, P extends keyof A>(
  prop: P,
): (<S>(sa: Prism<S, A>) => Optional<S, A[P]>) =>
  pipe(lensId<A>(), lensProp(prop), composeLens);

export const props = <A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): (<S>(sa: Prism<S, A>) => Optional<S, { [K in P]: A[K] }>) =>
  pipe(lensId<A>(), lensProps(...props), composeLens);

export const index = (i: number) =>
  <S, A>(sa: Prism<S, ReadonlyArray<A>>): Optional<S, A> =>
    pipe(sa, composeOptional(indexArray<A>().index(i)));

export const key = (key: string) =>
  <S, A>(sa: Prism<S, Readonly<Record<string, A>>>): Optional<S, A> =>
    pipe(sa, composeOptional(indexRecord<A>().index(key)));

export const atKey = (key: string) =>
  <S, A>(sa: Prism<S, Readonly<Record<string, A>>>): Optional<S, O.Option<A>> =>
    pipe(sa, composeLens(atRecord<A>().at(key)));

/*******************************************************************************
 * Pipeable Over ADT
 ******************************************************************************/

export const some = <A>(): Prism<O.Option<A>, A> => ({
  getOption: identity,
  reverseGet: O.some,
});

export const right = <E, A>(): Prism<E.Either<E, A>, A> => ({
  getOption: E.getRight,
  reverseGet: E.right,
});

export const left = <E, A>(): Prism<E.Either<E, A>, E> => ({
  getOption: E.getLeft,
  reverseGet: E.left,
});
