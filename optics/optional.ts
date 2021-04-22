import type * as TC from "../type_classes.ts";
import type { Kind, URIS } from "../hkt.ts";
import type { Predicate, Refinement } from "../types.ts";
import type { Either } from "../either.ts";
import type { Option } from "../option.ts";

import type { Iso } from "./iso.ts";
import type { Lens } from "./lens.ts";
import type { Prism } from "./prism.ts";
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

export type Optional<S, A> = {
  readonly getOption: (s: S) => Option<A>;
  readonly set: (a: A) => (s: S) => S;
};

export type From<T> = T extends Optional<infer S, infer _> ? S : never;

export type To<T> = T extends Optional<infer _, infer A> ? A : never;

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const make = <S, A>(
  getOption: (s: S) => Option<A>,
  set: (a: A) => (s: S) => S,
): Optional<S, A> => ({ getOption, set });

/*******************************************************************************
 * Converters
 ******************************************************************************/

export const asTraversal = <S, A>(sa: Optional<S, A>): Traversal<S, A> => ({
  traverse: (F) =>
    (fata) =>
      (s) =>
        pipe(
          sa.getOption(s),
          O.fold(
            () => F.of(s),
            (a) => pipe(fata(a), F.map((a: A) => sa.set(a)(s))),
          ),
        ),
});

export const fromNullable = <S, A>(
  sa: Optional<S, A>,
): Optional<S, NonNullable<A>> => ({
  getOption: flow(sa.getOption, O.chain(O.fromNullable)),
  set: sa.set,
});

/*******************************************************************************
 * Pipeable Compose
 ******************************************************************************/

export const id = <A>(): Optional<A, A> => ({
  getOption: O.some,
  set: constant,
});

export const compose = <J, K>(jk: Optional<J, K>) =>
  <I>(ij: Optional<I, J>): Optional<I, K> => ({
    getOption: flow(ij.getOption, O.chain(jk.getOption)),
    set: (b) =>
      (s) =>
        pipe(
          ij.getOption(s),
          O.map(jk.set(b)),
          O.fold(() => identity, ij.set),
        )(s),
  });

export const composeIso = <A, B>(ab: Iso<A, B>) =>
  <S>(sa: Optional<S, A>): Optional<S, B> => ({
    getOption: flow(sa.getOption, O.map(ab.get)),
    set: flow(ab.reverseGet, sa.set),
  });

export const composeLens = <A, B>(ab: Lens<A, B>) =>
  <S>(sa: Optional<S, A>): Optional<S, B> => ({
    getOption: flow(sa.getOption, O.map(ab.get)),
    set: (b) =>
      (s) =>
        pipe(
          sa.getOption(s),
          O.map(ab.set(b)),
          O.fold(constant(s), flow(sa.set, apply(s))),
        ),
  });

export const composePrism = <A, B>(ab: Prism<A, B>) =>
  <S>(sa: Optional<S, A>): Optional<S, B> => ({
    getOption: flow(sa.getOption, O.chain(ab.getOption)),
    set: flow(ab.reverseGet, sa.set),
  });

export const composeTraversal = <A, B>(ab: Traversal<A, B>) =>
  <S>(sa: Optional<S, A>): Traversal<S, B> => ({
    traverse: (T) =>
      (fata) =>
        (s) =>
          pipe(
            sa.getOption(s),
            O.fold(
              constant(T.of(s)),
              flow(ab.traverse(T)(fata), T.map(flow(sa.set, apply(s)))),
            ),
          ),
  });

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

type FilterFn = {
  <A, B extends A>(refinement: Refinement<A, B>): <S>(
    sa: Optional<S, A>,
  ) => Optional<S, B>;
  <A>(predicate: Predicate<A>): <S>(sa: Optional<S, A>) => Optional<S, A>;
};

export const filter: FilterFn = <A>(predicate: Predicate<A>) =>
  <S>(sa: Optional<S, A>): Optional<S, A> => ({
    getOption: flow(sa.getOption, O.chain(O.fromPredicate(predicate))),
    set: sa.set,
  });

export const modify = <A>(faa: (a: A) => A) =>
  <S>(sa: Optional<S, A>) =>
    (s: S): S =>
      pipe(
        sa.getOption(s),
        O.map(faa),
        O.fold(constant(s), flow(sa.set, apply(s))),
      );

export const traverse = <URI extends URIS>(T: TC.Traversable<URI>) => {
  const _traversal = fromTraversable(T);
  return <S, A, B = never, C = never, D = never>(
    sa: Optional<S, Kind<URI, [A, B, C, D]>>,
  ): Traversal<S, A> =>
    pipe(
      sa,
      composeTraversal(_traversal<A, B, C, D>()),
    );
};

export const prop = <A, P extends keyof A>(prop: P) =>
  pipe(lensId<A>(), lensProp(prop), composeLens);

export const props = <A, P extends keyof A>(...props: [P, P, ...Array<P>]) =>
  pipe(lensId<A>(), lensProps(...props), composeLens);

export const index = (i: number) =>
  <S, A>(sa: Optional<S, ReadonlyArray<A>>): Optional<S, A> =>
    pipe(sa, compose(indexArray<A>().index(i)));

export const key = (key: string) =>
  <S, A>(sa: Optional<S, Readonly<Record<string, A>>>): Optional<S, A> =>
    pipe(sa, compose(indexRecord<A>().index(key)));

export const atKey = (key: string) =>
  <S, A>(
    sa: Optional<S, Readonly<Record<string, A>>>,
  ): Optional<S, Option<A>> => pipe(sa, composeLens(atRecord<A>().at(key)));

/*******************************************************************************
 * Pipeable Over ADT
 ******************************************************************************/

export const some: <S, A>(
  soa: Optional<S, Option<A>>,
) => Optional<S, A> = compose({
  getOption: identity,
  set: flow(O.some, constant),
});

export const right: <S, E, A>(
  sea: Optional<S, Either<E, A>>,
) => Optional<S, A> = compose({
  getOption: E.getRight,
  set: flow(E.right, constant),
});

export const left: <S, E, A>(
  sea: Optional<S, Either<E, A>>,
) => Optional<S, E> = compose({
  getOption: E.getLeft,
  set: flow(E.left, constant),
});
