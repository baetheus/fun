import type * as TC from "../type_classes.ts";
import type { Kind, URIS } from "../hkt.ts";
import type { Predicate, Refinement } from "../types.ts";
import type { Either } from "../either.ts";
import type { Option } from "../option.ts";

import * as I from "../identity.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import * as C from "../const.ts";
import * as A from "../array.ts";
import { flow, identity, pipe } from "../fns.ts";

import { fromTraversable } from "./from_traversable.ts";
import { atRecord } from "./at.ts";
import { indexArray, indexRecord } from "./index.ts";
import { asTraversal as isoAsTraversal } from "./iso.ts";
import { asTraversal as prismAsTraversal, fromPredicate } from "./prism.ts";
import { asTraversal as optionalAsTraversal } from "./optional.ts";
import {
  asTraversal as lensAsTraversal,
  id as lensId,
  prop as lensProp,
  props as lensProps,
} from "./lens.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Traversal<S, A> = {
  readonly traverse: <URI extends URIS>(
    A: TC.Applicative<URI>,
  ) => <B = never, C = never, D = never>(
    fata: (a: A) => Kind<URI, [A, B, C, D]>,
  ) => (s: S) => Kind<URI, [S, B, C, D]>;
};

export type From<T> = T extends Traversal<infer S, infer _> ? S : never;

export type To<T> = T extends Traversal<infer _, infer A> ? A : never;

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export { fromTraversable };

/*******************************************************************************
 * Pipeable Compose
 ******************************************************************************/

export const compose = <J, K>(jk: Traversal<J, K>) =>
  <I>(ij: Traversal<I, J>): Traversal<I, K> => ({
    traverse: (F) => flow(jk.traverse(F), ij.traverse(F)),
  });

export const composeIso = flow(isoAsTraversal, compose);

export const composeLens = flow(lensAsTraversal, compose);

export const composePrism = flow(prismAsTraversal, compose);

export const composeOptional = flow(optionalAsTraversal, compose);

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const id = <A>(): Traversal<A, A> => ({
  traverse: () => identity,
});

export const modify = <A>(f: (a: A) => A) =>
  <S>(sa: Traversal<S, A>) => pipe(f, sa.traverse(I.Applicative));

export const set = <A>(a: A): (<S>(sa: Traversal<S, A>) => (s: S) => S) => {
  return modify(() => a);
};

type FilterFn = {
  <A, B extends A>(refinement: Refinement<A, B>): <S>(
    sa: Traversal<S, A>,
  ) => Traversal<S, B>;
  <A>(predicate: Predicate<A>): <S>(sa: Traversal<S, A>) => Traversal<S, A>;
};

export const filter: FilterFn = <A>(predicate: Predicate<A>) =>
  pipe(fromPredicate(predicate), composePrism);

export const prop = <A, P extends keyof A>(
  prop: P,
): (<S>(sa: Traversal<S, A>) => Traversal<S, A[P]>) =>
  pipe(lensId<A>(), lensProp(prop), composeLens);

export const props = <A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): (<S>(sa: Traversal<S, A>) => Traversal<S, { [K in P]: A[K] }>) =>
  pipe(lensId<A>(), lensProps(...props), composeLens);

export const index = (i: number) =>
  <S, A>(
    sa: Traversal<S, ReadonlyArray<A>>,
  ): Traversal<S, A> => pipe(sa, composeOptional(indexArray<A>().index(i)));

export const key = (key: string) =>
  <S, A>(
    sa: Traversal<S, Readonly<Record<string, A>>>,
  ): Traversal<S, A> => pipe(sa, composeOptional(indexRecord<A>().index(key)));

export const atKey = (key: string) =>
  <S, A>(
    sa: Traversal<S, Readonly<Record<string, A>>>,
  ): Traversal<S, Option<A>> => pipe(sa, composeLens(atRecord<A>().at(key)));

export const traverse = <URI extends URIS>(T: TC.Traversable<URI>) => {
  const _traversal = fromTraversable(T);
  return <S, A, B = never, C = never, D = never>(
    sa: Traversal<S, Kind<URI, [A, B, C, D]>>,
  ): Traversal<S, A> =>
    pipe(
      sa,
      compose(_traversal<A, B, C, D>()),
    );
};

export const foldMap = <M>(M: TC.Monoid<M>) => {
  const Applicative = C.getApplicative(M);
  return <A>(fam: (a: A) => M) =>
    <S>(sa: Traversal<S, A>): ((s: S) => M) =>
      pipe(fam, sa.traverse(Applicative));
};

export const getAll = <S, A>(sa: Traversal<S, A>) =>
  pipe((a: A) => [a], foldMap(A.getMonoid<A>()))(sa);

/*******************************************************************************
 * Pipeable Over ADT
 ******************************************************************************/

export const some: <S, A>(
  soa: Traversal<S, Option<A>>,
) => Traversal<S, A> = composePrism({
  getOption: identity,
  reverseGet: O.some,
});

export const right: <S, E, A>(
  sea: Traversal<S, Either<E, A>>,
) => Traversal<S, A> = composePrism({
  getOption: E.getRight,
  reverseGet: E.right,
});

export const left: <S, E, A>(
  sea: Traversal<S, Either<E, A>>,
) => Traversal<S, E> = composePrism({
  getOption: E.getLeft,
  reverseGet: E.left,
});
