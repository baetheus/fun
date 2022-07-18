import type * as T from "./types.ts";
import type { Kind, URIS } from "./kind.ts";
import type { Predicate, Refinement } from "./types.ts";
import type { Either } from "./either.ts";
import type { Option } from "./option.ts";

import * as I from "./identity.ts";
import * as O from "./option.ts";
import * as E from "./either.ts";
import * as C from "./const.ts";
import * as A from "./array.ts";
import { flow, identity, pipe } from "./fns.ts";

import { fromTraversable } from "./from_traversable.ts";
import { atRecord } from "./at.ts";
import { indexArray, indexRecord } from "./index.ts";
import { asTraversal as isoAsTraversal } from "./iso.ts";
import {
  asTraversal as prismAsTraversal,
  fromPredicate,
  prism,
} from "./prism.ts";
import { asTraversal as optionalAsTraversal } from "./optional.ts";
import {
  asTraversal as lensAsTraversal,
  id as lensId,
  prop as lensProp,
  props as lensProps,
} from "./lens.ts";

export type Traversal<S, A> = {
  readonly tag: "Traversal";
  readonly traverse: <URI extends URIS>(
    A: T.Applicative<URI>,
  ) => <B = never, C = never, D = never>(
    fata: (a: A) => Kind<URI, [A, B, C, D]>,
  ) => (s: S) => Kind<URI, [S, B, C, D]>;
};

export type From<T> = T extends Traversal<infer S, infer _> ? S : never;

export type To<T> = T extends Traversal<infer _, infer A> ? A : never;

export function make<S, A>(
  traverse: <URI extends URIS>(
    A: T.Applicative<URI>,
  ) => <B = never, C = never, D = never>(
    fata: (a: A) => Kind<URI, [A, B, C, D]>,
  ) => (s: S) => Kind<URI, [S, B, C, D]>,
): Traversal<S, A> {
  return ({ tag: "Traversal", traverse });
}

export { fromTraversable };

export function compose<J, K>(
  jk: Traversal<J, K>,
): <I>(ij: Traversal<I, J>) => Traversal<I, K> {
  return (ij) => ({
    tag: "Traversal",
    traverse: (F) => flow(jk.traverse(F), ij.traverse(F)),
  });
}

export const composeIso = flow(isoAsTraversal, compose);

export const composeLens = flow(lensAsTraversal, compose);

export const composePrism = flow(prismAsTraversal, compose);

export const composeOptional = flow(optionalAsTraversal, compose);

export function id<A>(): Traversal<A, A> {
  return make(() => identity);
}

export function modify<A>(
  f: (a: A) => A,
): <S>(sa: Traversal<S, A>) => (s: S) => S {
  return (sa) => pipe(f, sa.traverse(I.Applicative));
}

export function set<A>(a: A): <S>(sa: Traversal<S, A>) => (s: S) => S {
  return modify(() => a);
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(
  sa: Traversal<S, A>,
) => Traversal<S, B>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Traversal<S, A>) => Traversal<S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Traversal<S, A>) => Traversal<S, A> {
  return pipe(fromPredicate(predicate), composePrism);
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Traversal<S, A>) => Traversal<S, A[P]> {
  return pipe(lensId<A>(), lensProp(prop), composeLens);
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Traversal<S, A>) => Traversal<S, { [K in P]: A[K] }> {
  return pipe(lensId<A>(), lensProps(...props), composeLens);
}

export function index(
  i: number,
): <S, A>(sa: Traversal<S, ReadonlyArray<A>>) => Traversal<S, A> {
  // deno-lint-ignore no-explicit-any
  return composeOptional(indexArray<any>().index(i));
}

export function key(
  key: string,
): <S, A>(sa: Traversal<S, Readonly<Record<string, A>>>) => Traversal<S, A> {
  // deno-lint-ignore no-explicit-any
  return composeOptional(indexRecord<any>().index(key));
}

export function atKey(
  key: string,
): <S, A>(
  sa: Traversal<S, Readonly<Record<string, A>>>,
) => Traversal<S, Option<A>> {
  // deno-lint-ignore no-explicit-any
  return composeLens(atRecord<any>().at(key));
}

export function traverse<URI extends URIS>(
  T: T.Traversable<URI>,
): <S, A, B = never, C = never, D = never>(
  sa: Traversal<S, Kind<URI, [A, B, C, D]>>,
) => Traversal<S, A> {
  const _traversal = fromTraversable(T);
  return compose(_traversal());
}

export function foldMap<M>(
  M: T.Monoid<M>,
): <A>(fam: (a: A) => M) => <S>(sa: Traversal<S, A>) => (s: S) => M {
  const _applicative = C.getApplicative(M);
  return (fam) => (sa) => pipe(fam, sa.traverse(_applicative));
}

export function getAll<S, A>(sa: Traversal<S, A>): (s: S) => ReadonlyArray<A> {
  return pipe((a: A) => [a], foldMap(A.getMonoid<A>()))(sa);
}

export function some<S, A>(soa: Traversal<S, Option<A>>): Traversal<S, A> {
  return pipe(soa, composePrism(prism(identity, O.some)));
}

export function right<S, E, A>(
  sea: Traversal<S, Either<E, A>>,
): Traversal<S, A> {
  return pipe(sea, composePrism(prism(E.getRight, E.right)));
}

export function left<S, E, A>(
  sea: Traversal<S, Either<E, A>>,
): Traversal<S, E> {
  return pipe(sea, composePrism(prism(E.getLeft, E.left)));
}
