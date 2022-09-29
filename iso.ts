import type { $, Kind, Predicate, Refinement, Traversable } from "./types.ts";
import type { Either } from "./either.ts";
import type { Option } from "./option.ts";

import type { Optic } from "./optic.ts";
import type { Lens } from "./lens.ts";
import type { Optional } from "./optional.ts";
import type { Prism } from "./prism.ts";
import type { Traversal } from "./traversal.ts";

import { toTraversal } from "./traversable.ts";
import { lens, prop as lensProp } from "./lens.ts";
import { prism } from "./prism.ts";
import { optional } from "./optional.ts";

import * as O from "./option.ts";
import * as E from "./either.ts";
import { constant, flow, identity } from "./fns.ts";

export type Iso<S, A> = {
  readonly tag: "Iso";
  readonly get: (s: S) => A;
  readonly reverseGet: (s: A) => S;
};

export function iso<A, B>(
  get: (a: A) => B,
  reverseGet: (b: B) => A,
): Iso<A, B> {
  return { tag: "Iso", get, reverseGet };
}

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
    traverse: ({ map }) => (fata) =>
      flow(
        sa.get,
        fata,
        map(sa.reverseGet),
      ),
  };
}

const _id = iso(identity, identity);

export function id<A>(): Iso<A, A> {
  return _id as Iso<A, A>;
}

export function composeIso<A, B, C>(
  left: Iso<A, B>,
  right: Iso<B, C>,
): Iso<A, C> {
  return iso(
    flow(left.get, right.get),
    flow(right.reverseGet, left.reverseGet),
  );
}

export function composeLens<A, B, C>(
  left: Iso<A, B>,
  right: Lens<B, C>,
): Lens<A, C> {
  return lens(
    flow(left.get, right.get),
    (b) => flow(left.get, right.set(b), left.reverseGet),
  );
}

export function composePrism<A, B, C>(
  left: Iso<A, B>,
  right: Prism<B, C>,
): Prism<A, C> {
  return prism(
    flow(left.get, right.getOption),
    flow(right.reverseGet, left.reverseGet),
  );
}

export function composeOptional<A, B, C>(
  left: Iso<A, B>,
  right: Optional<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.get, right.getOption),
    (b) => flow(left.get, right.set(b), left.reverseGet),
  );
}

export function composeTraversal<A, B, C>(
  left: Iso<A, B>,
  right: Traversal<B, C>,
): Traversal<A, C> {
  return ({
    tag: "Traversal",
    traverse: (A) => (fata) =>
      flow(
        left.get,
        right.traverse(A)(fata),
        A.map(left.reverseGet),
      ),
  });
}

// deno-fmt-ignore
export type Compose<Left, Right> =
  Left extends Iso<infer A, infer B> ?
    Right extends Iso<B, infer C> ? Iso<A, C>
    : Right extends Lens<B, infer C> ? Lens<A, C>
    : Right extends Prism<B, infer C> ? Prism<A, C>
    : Right extends Optional<B, infer C> ? Optional<A, C>
    : Right extends Traversal<B, infer C> ? Traversal<A, C>
    : never
  : never;

// deno-lint-ignore no-explicit-any
type NarrowCompose<R> = R extends Optic<infer B, infer _> ? Iso<any, B>
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
    iso(
      flow(sa.get, ab),
      flow(ba, sa.reverseGet),
    );
}

export function reverse<S, A>(sa: Iso<S, A>): Iso<A, S> {
  return iso(sa.reverseGet, sa.get);
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Iso<S, A>) => Lens<S, A[P]> {
  return flow(asLens, lensProp(prop));
}

export function traverse<U extends Kind>(
  T: Traversable<U>,
): <S, A, B = never, C = never, D = never, E = never>(
  sa: Iso<S, $<U, [A, B, C], [D], [E]>>,
) => Traversal<S, A> {
  const _traversal = toTraversal(T);
  return (sa) => composeTraversal(sa, _traversal());
}

export function some<S, A>(soa: Iso<S, Option<A>>): Prism<S, A> {
  return composePrism(soa, prism(identity, O.some));
}

export function right<S, E, A>(sea: Iso<S, Either<E, A>>): Prism<S, A> {
  return composePrism(sea, prism(E.getRight, E.right));
}

export function left<S, E, A>(sea: Iso<S, Either<E, A>>): Prism<S, E> {
  return composePrism(sea, prism(E.getLeft, E.left));
}
