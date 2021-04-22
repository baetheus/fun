import type * as TC from "../type_classes.ts";
import type { Kind, URIS } from "../hkt.ts";
import type { Either } from "../either.ts";
import type { Option } from "../option.ts";

import type { Lens } from "./lens.ts";
import type { Optional } from "./optional.ts";
import type { Prism } from "./prism.ts";
import type { Traversal } from "./traversal.ts";

import { fromTraversable } from "./from_traversable.ts";

import * as O from "../option.ts";
import * as E from "../either.ts";
import { constant, flow, identity, pipe } from "../fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Iso<S, A> = {
  readonly get: (s: S) => A;
  readonly reverseGet: (s: A) => S;
};

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const make = <A, B>(
  get: (a: A) => B,
  reverseGet: (b: B) => A,
): Iso<A, B> => ({
  get,
  reverseGet,
});

/*******************************************************************************
 * Modules
 ******************************************************************************/

/*******************************************************************************
 * Converters
 ******************************************************************************/

export const asLens = <S, A>(sa: Iso<S, A>): Lens<S, A> => ({
  get: sa.get,
  set: flow(sa.reverseGet, constant),
});

export const asPrism = <S, A>(sa: Iso<S, A>): Prism<S, A> => ({
  getOption: flow(sa.get, O.some),
  reverseGet: sa.reverseGet,
});

export const asOptional = <S, A>(sa: Iso<S, A>): Optional<S, A> => ({
  getOption: flow(sa.get, O.some),
  set: flow(sa.reverseGet, constant),
});

export const asTraversal = <S, A>(sa: Iso<S, A>): Traversal<S, A> => ({
  traverse: ({ map }) =>
    (fata) =>
      flow(
        sa.get,
        fata,
        map(sa.reverseGet),
      ),
});

/*******************************************************************************
 * Pipeable Compose
 ******************************************************************************/

export const id = <A>(): Iso<A, A> => ({
  get: identity,
  reverseGet: identity,
});

export const compose = <J, K>(jk: Iso<J, K>) =>
  <I>(ij: Iso<I, J>): Iso<I, K> => ({
    get: flow(ij.get, jk.get),
    reverseGet: flow(jk.reverseGet, ij.reverseGet),
  });

export const composeLens = <A, B>(ab: Lens<A, B>) =>
  <S>(sa: Iso<S, A>): Lens<S, B> => ({
    get: flow(sa.get, ab.get),
    set: (b) => flow(sa.get, ab.set(b), sa.reverseGet),
  });

export const composePrism = <A, B>(ab: Prism<A, B>) =>
  <S>(sa: Iso<S, A>): Prism<S, B> => ({
    getOption: flow(sa.get, ab.getOption),
    reverseGet: flow(ab.reverseGet, sa.reverseGet),
  });

export const composeOptional = <A, B>(ab: Optional<A, B>) =>
  <S>(sa: Iso<S, A>): Optional<S, B> => ({
    getOption: flow(sa.get, ab.getOption),
    set: (b) => flow(sa.get, ab.set(b), sa.reverseGet),
  });

export const composeTraversal = <A, B>(ab: Traversal<A, B>) =>
  <S>(sa: Iso<S, A>): Traversal<S, B> => ({
    traverse: (A) =>
      (fata) =>
        flow(
          sa.get,
          ab.traverse(A)(fata),
          A.map(sa.reverseGet),
        ),
  });

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const modify = <A>(f: (a: A) => A) =>
  <S>(sa: Iso<S, A>) => (s: S): S => sa.reverseGet(f(sa.get(s)));

export const map = <A, B>(ab: (a: A) => B, ba: (b: B) => A) =>
  <S>(sa: Iso<S, A>): Iso<S, B> => ({
    get: flow(sa.get, ab),
    reverseGet: flow(ba, sa.reverseGet),
  });

export const reverse = <S, A>(sa: Iso<S, A>): Iso<A, S> => ({
  get: sa.reverseGet,
  reverseGet: sa.get,
});

export const traverse = <URI extends URIS>(T: TC.Traversable<URI>) => {
  const _traversal = fromTraversable(T);
  return <S, A, B = never, C = never, D = never>(
    sa: Iso<S, Kind<URI, [A, B, C, D]>>,
  ): Traversal<S, A> =>
    pipe(
      sa,
      composeTraversal(_traversal<A, B, C, D>()),
    );
};

/*******************************************************************************
 * Pipeable Over ADT
 ******************************************************************************/

export const some: <S, A>(soa: Iso<S, Option<A>>) => Prism<S, A> = composePrism(
  {
    getOption: identity,
    reverseGet: O.some,
  },
);

export const right: <S, E, A>(
  sea: Iso<S, Either<E, A>>,
) => Prism<S, A> = composePrism({
  getOption: E.getRight,
  reverseGet: E.right,
});

export const left: <S, E, A>(
  sea: Iso<S, Either<E, A>>,
) => Prism<S, E> = composePrism({
  getOption: E.getLeft,
  reverseGet: E.left,
});
