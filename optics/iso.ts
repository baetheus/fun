import type * as TC from "../type_classes.ts";
import type { Kind, URIS } from "../hkt.ts";
import type { Either } from "../either.ts";
import type { Option } from "../option.ts";
import type { Predicate, Refinement } from "../types.ts";

import type { Lens } from "./lens.ts";
import type { Optional } from "./optional.ts";
import type { Prism } from "./prism.ts";
import type { Traversal } from "./traversal.ts";

import { fromTraversable } from "./from_traversable.ts";
import { lens, optional, prism } from "./make.ts";

import * as O from "../option.ts";
import * as E from "../either.ts";
import { constant, flow, identity, pipe } from "../fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Iso<S, A> = {
  readonly tag: "Iso";
  readonly get: (s: S) => A;
  readonly reverseGet: (s: A) => S;
};

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export function make<A, B>(
  get: (a: A) => B,
  reverseGet: (b: B) => A,
): Iso<A, B> {
  return { tag: "Iso", get, reverseGet };
}

/*******************************************************************************
 * Converters
 ******************************************************************************/

export function asLens<S, A>(sa: Iso<S, A>): Lens<S, A> {
  return lens(sa.get, flow(sa.reverseGet, constant));
}

export function asPrism<S, A>(sa: Iso<S, A>): Prism<S, A> {
  return prism(flow(sa.get, O.some), sa.reverseGet);
}

export function asOptional<S, A>(sa: Iso<S, A>): Optional<S, A> {
  return optional(flow(sa.get, O.some), flow(sa.reverseGet, constant));
}

export function asTraversal<S, A>(sa: Iso<S, A>): Traversal<S, A> {
  return {
    tag: "Traversal",
    traverse: ({ map }) =>
      (fata) =>
        flow(
          sa.get,
          fata,
          map(sa.reverseGet),
        ),
  };
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

const _id = make(identity, identity);

export function id<A>(): Iso<A, A> {
  return _id as Iso<A, A>;
}

export function compose<J, K>(jk: Iso<J, K>): <I>(ij: Iso<I, J>) => Iso<I, K> {
  return (ij) => make(flow(ij.get, jk.get), flow(jk.reverseGet, ij.reverseGet));
}

export function composeLens<A, B>(
  ab: Lens<A, B>,
): <S>(sa: Iso<S, A>) => Lens<S, B> {
  return (sa) =>
    lens(flow(sa.get, ab.get), (b) => flow(sa.get, ab.set(b), sa.reverseGet));
}

export function composePrism<A, B>(
  ab: Prism<A, B>,
): <S>(sa: Iso<S, A>) => Prism<S, B> {
  return (sa) =>
    prism(flow(sa.get, ab.getOption), flow(ab.reverseGet, sa.reverseGet));
}

export function composeOptional<A, B>(
  ab: Optional<A, B>,
): <S>(sa: Iso<S, A>) => Optional<S, B> {
  return (sa) =>
    optional(
      flow(sa.get, ab.getOption),
      (b) => flow(sa.get, ab.set(b), sa.reverseGet),
    );
}

export function composeTraversal<A, B>(
  ab: Traversal<A, B>,
): <S>(sa: Iso<S, A>) => Traversal<S, B> {
  return (sa) => ({
    tag: "Traversal",
    traverse: (A) =>
      (fata) =>
        flow(
          sa.get,
          ab.traverse(A)(fata),
          A.map(sa.reverseGet),
        ),
  });
}

export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): <S>(sa: Iso<S, A>) => Optional<S, B>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Iso<S, A>) => Optional<S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Iso<S, A>) => Optional<S, A> {
  return (sa) =>
    optional(
      flow(sa.get, O.fromPredicate(predicate)),
      (a) => (_) => sa.reverseGet(a),
    );
}

export function modify<A>(f: (a: A) => A): <S>(sa: Iso<S, A>) => (s: S) => S {
  return (sa) => (s) => sa.reverseGet(f(sa.get(s)));
}

export function map<A, B>(
  ab: (a: A) => B,
  ba: (b: B) => A,
): <S>(sa: Iso<S, A>) => Iso<S, B> {
  return (sa) =>
    make(
      flow(sa.get, ab),
      flow(ba, sa.reverseGet),
    );
}

export function reverse<S, A>(sa: Iso<S, A>): Iso<A, S> {
  return make(sa.reverseGet, sa.get);
}

export function traverse<URI extends URIS>(
  T: TC.Traversable<URI>,
): <S, A, B = never, C = never, D = never>(
  sa: Iso<S, Kind<URI, [A, B, C, D]>>,
) => Traversal<S, A> {
  const _traversal = fromTraversable(T);
  return (sa) => pipe(sa, composeTraversal(_traversal()));
}

/*******************************************************************************
 * Pipeable Over ADT
 ******************************************************************************/

export function some<S, A>(soa: Iso<S, Option<A>>): Prism<S, A> {
  return pipe(soa, composePrism(prism(identity, O.some)));
}

export function right<S, E, A>(sea: Iso<S, Either<E, A>>): Prism<S, A> {
  return pipe(sea, composePrism(prism(E.getRight, E.right)));
}

export function left<S, E, A>(sea: Iso<S, Either<E, A>>): Prism<S, E> {
  return pipe(sea, composePrism(prism(E.getLeft, E.left)));
}
