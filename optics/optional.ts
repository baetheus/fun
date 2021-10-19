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
  readonly tag: "Optional";
  readonly getOption: (s: S) => Option<A>;
  readonly set: (a: A) => (s: S) => S;
};

export type From<T> = T extends Optional<infer S, infer _> ? S : never;

export type To<T> = T extends Optional<infer _, infer A> ? A : never;

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export function make<S, A>(
  getOption: (s: S) => Option<A>,
  set: (a: A) => (s: S) => S,
): Optional<S, A> {
  return { tag: "Optional", getOption, set };
}

/*******************************************************************************
 * Converters
 ******************************************************************************/

export function asTraversal<S, A>(sa: Optional<S, A>): Traversal<S, A> {
  return {
    tag: "Traversal",
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
  };
}

export function fromNullable<S, A>(
  sa: Optional<S, A>,
): Optional<S, NonNullable<A>> {
  return make(
    flow(sa.getOption, O.chain(O.fromNullable)),
    sa.set,
  );
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function id<A>(): Optional<A, A> {
  return make(O.some, constant);
}

export function compose<J, K>(
  jk: Optional<J, K>,
): <I>(ij: Optional<I, J>) => Optional<I, K> {
  return (ij) =>
    make(
      flow(ij.getOption, O.chain(jk.getOption)),
      (b) =>
        (s) =>
          pipe(
            ij.getOption(s),
            O.map(jk.set(b)),
            O.fold(() => identity, ij.set),
          )(s),
    );
}

export function composeIso<A, B>(
  ab: Iso<A, B>,
): <S>(sa: Optional<S, A>) => Optional<S, B> {
  return (sa) =>
    make(
      flow(sa.getOption, O.map(ab.get)),
      flow(ab.reverseGet, sa.set),
    );
}

export function composeLens<A, B>(
  ab: Lens<A, B>,
): <S>(sa: Optional<S, A>) => Optional<S, B> {
  return (sa) =>
    make(
      flow(sa.getOption, O.map(ab.get)),
      (b) =>
        (s) =>
          pipe(
            sa.getOption(s),
            O.map(ab.set(b)),
            O.fold(constant(s), flow(sa.set, apply(s))),
          ),
    );
}

export function composePrism<A, B>(
  ab: Prism<A, B>,
): <S>(sa: Optional<S, A>) => Optional<S, B> {
  return (sa) =>
    make(
      flow(sa.getOption, O.chain(ab.getOption)),
      flow(ab.reverseGet, sa.set),
    );
}

export function composeTraversal<A, B>(
  ab: Traversal<A, B>,
): <S>(sa: Optional<S, A>) => Traversal<S, B> {
  return (sa) => ({
    tag: "Traversal",
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
}

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): <S>(sa: Optional<S, A>) => Optional<S, B>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Optional<S, A>) => Optional<S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Optional<S, A>) => Optional<S, A> {
  return (sa) =>
    make(
      flow(sa.getOption, O.chain(O.fromPredicate(predicate))),
      sa.set,
    );
}

export function modify<A>(
  faa: (a: A) => A,
): <S>(sa: Optional<S, A>) => (s: S) => S {
  return (sa) =>
    (s) =>
      pipe(
        sa.getOption(s),
        O.map(faa),
        O.fold(constant(s), flow(sa.set, apply(s))),
      );
}

export function traverse<URI extends URIS>(
  T: TC.Traversable<URI>,
): <S, A, B = never, C = never, D = never>(
  sa: Optional<S, Kind<URI, [A, B, C, D]>>,
) => Traversal<S, A> {
  const _traversal = fromTraversable(T);
  return composeTraversal(_traversal());
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Optional<S, A>) => Optional<S, A[P]> {
  return pipe(lensId<A>(), lensProp(prop), composeLens);
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Optional<S, A>) => Optional<S, { [K in P]: A[K] }> {
  return pipe(lensId<A>(), lensProps(...props), composeLens);
}

export function index(
  i: number,
): <S, A>(sa: Optional<S, ReadonlyArray<A>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return compose(indexArray<any>().index(i));
}

export function key(
  key: string,
): <S, A>(sa: Optional<S, Readonly<Record<string, A>>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return compose(indexRecord<any>().index(key));
}

export function atKey(
  key: string,
): <S, A>(
  sa: Optional<S, Readonly<Record<string, A>>>,
) => Optional<S, Option<A>> {
  // deno-lint-ignore no-explicit-any
  return composeLens(atRecord<any>().at(key));
}

/*******************************************************************************
 * Pipeable Over ADT
 ******************************************************************************/

export function some<S, A>(soa: Optional<S, Option<A>>): Optional<S, A> {
  return pipe(soa, compose(make(identity, flow(O.some, constant))));
}

export function right<S, E, A>(sea: Optional<S, Either<E, A>>): Optional<S, A> {
  return pipe(sea, compose(make(E.getRight, flow(E.right, constant))));
}

export function left<S, E, A>(sea: Optional<S, Either<E, A>>): Optional<S, E> {
  return pipe(sea, compose(make(E.getLeft, flow(E.left, constant))));
}
