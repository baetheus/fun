import type { $, Kind } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Either } from "./either.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Traversable } from "./traversable.ts";

import type { Optic } from "./optic.ts";
import type { Iso } from "./iso.ts";
import type { Lens } from "./lens.ts";
import type { Prism } from "./prism.ts";
import type { Optional } from "./optional.ts";

import * as I from "./identity.ts";
import * as O from "./option.ts";
import * as E from "./either.ts";
import * as C from "./const.ts";
import * as A from "./array.ts";
import { flow, identity, pipe } from "./fns.ts";

import { toTraversal } from "./traversable.ts";
import { asTraversal as isoAsTraversal, iso } from "./iso.ts";
import {
  asTraversal as prismAsTraversal,
  fromPredicate,
  prism,
} from "./prism.ts";
import {
  asTraversal as optionalAsTraversal,
  indexArray,
  indexRecord,
} from "./optional.ts";
import {
  asTraversal as lensAsTraversal,
  atRecord,
  id as lensId,
  prop as lensProp,
  props as lensProps,
} from "./lens.ts";

export type Traversal<S, A> = {
  readonly tag: "Traversal";
  readonly traverse: <V extends Kind>(
    A: Applicative<V>,
  ) => <B, C, D, E>(
    fata: (a: A) => $<V, [A, B, C], [D], [E]>,
  ) => (s: S) => $<V, [S, B, C], [D], [E]>;
};

export type From<T> = T extends Traversal<infer S, infer _> ? S : never;

export type To<T> = T extends Traversal<infer _, infer A> ? A : never;

export function traversal<S, A>(
  traverse: <U extends Kind>(
    A: Applicative<U>,
  ) => <B = never, C = never, D = never, E = never>(
    fata: (a: A) => $<U, [A, B, C], [D], [E]>,
  ) => (s: S) => $<U, [S, B, C], [D], [E]>,
): Traversal<S, A> {
  return ({ tag: "Traversal", traverse });
}

export { toTraversal };

export function composeIso<A, B, C>(
  left: Traversal<A, B>,
  right: Iso<B, C>,
): Traversal<A, C> {
  return composeTraversal(left, isoAsTraversal(right));
}

export function composeLens<A, B, C>(
  left: Traversal<A, B>,
  right: Lens<B, C>,
): Traversal<A, C> {
  return composeTraversal(left, lensAsTraversal(right));
}

export function composePrism<A, B, C>(
  left: Traversal<A, B>,
  right: Prism<B, C>,
): Traversal<A, C> {
  return composeTraversal(left, prismAsTraversal(right));
}

export function composeOptional<A, B, C>(
  left: Traversal<A, B>,
  right: Optional<B, C>,
): Traversal<A, C> {
  return composeTraversal(left, optionalAsTraversal(right));
}

export function composeTraversal<A, B, C>(
  left: Traversal<A, B>,
  right: Traversal<B, C>,
): Traversal<A, C> {
  return ({
    tag: "Traversal",
    traverse: (F) => flow(right.traverse(F), left.traverse(F)),
  });
}

// deno-fmt-ignore
export type Compose<Left, Right> =
  Left extends Traversal<infer A, infer B> ?
    Right extends Iso<B, infer C> ? Iso<A, C>
    : Right extends Lens<B, infer C> ? Lens<A, C>
    : Right extends Prism<B, infer C> ? Prism<A, C>
    : Right extends Optional<B, infer C> ? Optional<A, C>
    : Right extends Traversal<B, infer C> ? Traversal<A, C>
    : never
  : never;

// deno-lint-ignore no-explicit-any
type NarrowCompose<R> = R extends Optic<infer B, infer _> ? Traversal<any, B>
  : never;

// deno-lint-ignore no-explicit-any
export function compose<R extends Optic<any, any>>(
  right: R,
): <L extends NarrowCompose<R>>(left: L) => Compose<L, R> {
  return <L extends NarrowCompose<R>>(left: L): Compose<L, R> => {
    switch (right.tag) {
      case "Iso":
        return composeIso(left, right) as Compose<L, R>;
      case "Lens":
        return composeLens(left, right) as Compose<L, R>;
      case "Prism":
        return composePrism(left, right) as Compose<L, R>;
      case "Optional":
        return composeOptional(left, right) as Compose<L, R>;
      case "Traversal":
        return composeTraversal(left, right) as Compose<L, R>;
    }
  };
}

export function id<A>(): Traversal<A, A> {
  return traversal(() => identity);
}

export function modify<A>(
  f: (a: A) => A,
): <S>(sa: Traversal<S, A>) => (s: S) => S {
  return (sa) => pipe(f, sa.traverse(I.MonadIdentity));
}

export function map<A, B>(
  ab: (a: A) => B,
  ba: (b: B) => A,
): <S>(sa: Traversal<S, A>) => Traversal<S, B> {
  return (sa) => composeIso(sa, iso(ab, ba));
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
  return (sa) => composePrism(sa, fromPredicate(predicate));
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Traversal<S, A>) => Traversal<S, A[P]> {
  const _prop = pipe(lensId<A>(), lensProp(prop));
  return (sa) => composeLens(sa, _prop);
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Traversal<S, A>) => Traversal<S, { [K in P]: A[K] }> {
  const _props = pipe(lensId<A>(), lensProps(...props));
  return (sa) => composeLens(sa, _props);
}

export function index(
  i: number,
): <S, A>(sa: Traversal<S, ReadonlyArray<A>>) => Traversal<S, A> {
  // deno-lint-ignore no-explicit-any
  const _index = indexArray<any>().index(i);
  return (sa) => composeOptional(sa, _index);
}

export function key(
  key: string,
): <S, A>(sa: Traversal<S, Readonly<Record<string, A>>>) => Traversal<S, A> {
  // deno-lint-ignore no-explicit-any
  const _index = indexRecord<any>().index(key);
  return (sa) => composeOptional(sa, _index);
}

export function atKey(
  key: string,
): <S, A>(
  sa: Traversal<S, Readonly<Record<string, A>>>,
) => Traversal<S, Option<A>> {
  // deno-lint-ignore no-explicit-any
  const _at = atRecord<any>().at(key);
  return (sa) => composeLens(sa, _at);
}

export function traverse<U extends Kind>(
  T: Traversable<U>,
): <S, A, B = never, C = never, D = never, E = never>(
  sa: Traversal<S, $<U, [A, B, C], [D], [E]>>,
) => Traversal<S, A> {
  const _traversal = toTraversal(T);
  return (sa) => composeTraversal(sa, _traversal());
}

export function foldMap<M>(
  M: Monoid<M>,
): <A>(fam: (a: A) => M) => <S>(sa: Traversal<S, A>) => (s: S) => M {
  const _applicative = C.getApplicative(M);
  return (fam) => (sa) => pipe(fam, sa.traverse(_applicative));
}

export function getAll<S, A>(sa: Traversal<S, A>): (s: S) => ReadonlyArray<A> {
  return pipe((a: A) => [a], foldMap(A.getMonoid<A>()))(sa);
}

export function some<S, A>(soa: Traversal<S, Option<A>>): Traversal<S, A> {
  return composePrism(soa, prism(identity, O.some));
}

export function right<S, E, A>(
  sea: Traversal<S, Either<E, A>>,
): Traversal<S, A> {
  return composePrism(sea, prism(E.getRight, E.right));
}

export function left<S, E, A>(
  sea: Traversal<S, Either<E, A>>,
): Traversal<S, E> {
  return composePrism(sea, prism(E.getLeft, E.left));
}
