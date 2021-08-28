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

export function make<S, A>(
  getOption: (s: S) => O.Option<A>,
  reverseGet: (a: A) => S,
): Prism<S, A> {
  return { getOption, reverseGet };
}

export function fromPredicate<S, A extends S>(
  refinement: Refinement<S, A>,
): Prism<S, A>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): Prism<A, A>;
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return { getOption: O.fromPredicate(predicate), reverseGet: identity };
}

/*******************************************************************************
 * Converters
 ******************************************************************************/

export function asOptional<S, A>(sa: Prism<S, A>): Optional<S, A> {
  return { getOption: sa.getOption, set: getSet(sa) };
}

export function asTraversal<S, A>(sa: Prism<S, A>): Traversal<S, A> {
  return {
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
  };
}

export function fromNullable<S, A>(sa: Prism<S, A>): Prism<S, NonNullable<A>> {
  return {
    getOption: flow(sa.getOption, O.chain(O.fromNullable)),
    reverseGet: sa.reverseGet,
  };
}

/*******************************************************************************
 * Pipeable Compose
 ******************************************************************************/

export function id<A>(): Prism<A, A> {
  return { getOption: O.some, reverseGet: identity };
}

export function compose<J, K>(
  jk: Prism<J, K>,
): <I>(ij: Prism<I, J>) => Prism<I, K> {
  return (ij) => ({
    getOption: flow(ij.getOption, O.chain(jk.getOption)),
    reverseGet: flow(jk.reverseGet, ij.reverseGet),
  });
}

export function composeIso<A, B>(
  ab: Iso<A, B>,
): <S>(sa: Prism<S, A>) => Prism<S, B> {
  return (sa) => ({
    getOption: flow(sa.getOption, O.map(ab.get)),
    reverseGet: flow(ab.reverseGet, sa.reverseGet),
  });
}

export function composeLens<A, B>(
  ab: Lens<A, B>,
): <S>(sa: Prism<S, A>) => Optional<S, B> {
  return (sa) => ({
    getOption: flow(sa.getOption, O.map(ab.get)),
    set: (b) =>
      (s) =>
        pipe(
          sa.getOption(s),
          O.fold(() => s, flow(ab.set(b), sa.reverseGet)),
        ),
  });
}

export function composeOptional<A, B>(
  ab: Optional<A, B>,
): <S>(sa: Prism<S, A>) => Optional<S, B> {
  return (sa) => ({
    getOption: flow(sa.getOption, O.chain(ab.getOption)),
    set: (b) =>
      (s) =>
        pipe(
          sa.getOption(s),
          O.fold(() => s, flow(ab.set(b), sa.reverseGet)),
        ),
  });
}

export function composeTraversal<A, B>(
  ab: Traversal<A, B>,
): <S>(sa: Prism<S, A>) => Traversal<S, B> {
  return (sa) => ({
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
}

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): <S>(sa: Prism<S, A>) => Prism<S, B>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Prism<S, A>) => Prism<S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Prism<S, A>) => Prism<S, A> {
  return (sa) => ({
    getOption: flow(sa.getOption, O.chain(O.fromPredicate(predicate))),
    reverseGet: sa.reverseGet,
  });
}

export function traverse<URI extends URIS>(
  T: TC.Traversable<URI>,
): <S, A, B = never, C = never, D = never>(
  sa: Prism<S, Kind<URI, [A, B, C, D]>>,
) => Traversal<S, A> {
  const _traversal = fromTraversable(T);
  return composeTraversal(_traversal());
}

export function modify<A>(f: (a: A) => A): <S>(sa: Prism<S, A>) => (s: S) => S {
  return (sa) =>
    (s) =>
      pipe(
        sa.getOption(s),
        O.map((a) => {
          const na = f(a);
          return na === a ? s : sa.reverseGet(na);
        }),
        O.getOrElse(() => s),
      );
}

export function getSet<S, A>(sa: Prism<S, A>): (a: A) => (s: S) => S {
  return (a) => pipe(sa, modify(constant(a)));
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
  return pipe(lensId<A>(), lensProp(prop), composeLens);
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Prism<S, A>) => Optional<S, { [K in P]: A[K] }> {
  return pipe(lensId<A>(), lensProps(...props), composeLens);
}

export function index(
  i: number,
): <S, A>(sa: Prism<S, ReadonlyArray<A>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return composeOptional(indexArray<any>().index(i));
}

export function key(
  key: string,
): <S, A>(sa: Prism<S, Readonly<Record<string, A>>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return composeOptional(indexRecord<any>().index(key));
}

export function atKey(
  key: string,
): <S, A>(
  sa: Prism<S, Readonly<Record<string, A>>>,
) => Optional<S, O.Option<A>> {
  // deno-lint-ignore no-explicit-any
  return composeLens(atRecord<any>().at(key));
}

/*******************************************************************************
 * Pipeable Over ADT
 ******************************************************************************/

export function some<A>(): Prism<O.Option<A>, A> {
  return { getOption: identity, reverseGet: O.some };
}

export function right<E, A>(): Prism<E.Either<E, A>, A> {
  return { getOption: E.getRight, reverseGet: E.right };
}

export function left<E, A>(): Prism<E.Either<E, A>, E> {
  return { getOption: E.getLeft, reverseGet: E.left };
}
