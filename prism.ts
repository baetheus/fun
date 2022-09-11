import type * as T from "./types.ts";
import type { Kind, URIS } from "./kind.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";

import type { Optic } from "./optic.ts";
import type { Iso } from "./iso.ts";
import type { Lens } from "./lens.ts";
import type { Optional } from "./optional.ts";
import type { Traversal } from "./traversal.ts";

import { toTraversal } from "./traversable.ts";
import { optional } from "./optional.ts";

import * as O from "./option.ts";
import * as E from "./either.ts";
import { apply, constant, flow, identity, pipe } from "./fns.ts";

import {
  atRecord,
  id as lensId,
  prop as lensProp,
  props as lensProps,
} from "./lens.ts";
import { indexArray, indexRecord } from "./optional.ts";

export type Prism<S, A> = {
  readonly tag: "Prism";
  readonly getOption: (s: S) => O.Option<A>;
  readonly reverseGet: (a: A) => S;
};

export type From<T> = T extends Prism<infer S, infer _> ? S : never;

export type To<T> = T extends Prism<infer _, infer A> ? A : never;

export function prism<S, A>(
  getOption: (s: S) => O.Option<A>,
  reverseGet: (a: A) => S,
): Prism<S, A> {
  return { tag: "Prism", getOption, reverseGet };
}

export function fromPredicate<S, A extends S>(
  refinement: Refinement<S, A>,
): Prism<S, A>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): Prism<A, A>;
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return prism(O.fromPredicate(predicate), identity);
}

export function asOptional<S, A>(sa: Prism<S, A>): Optional<S, A> {
  return optional(sa.getOption, getSet(sa));
}

export function asTraversal<S, A>(sa: Prism<S, A>): Traversal<S, A> {
  return {
    tag: "Traversal",
    traverse: (T) => (fata) => (s) =>
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
  return prism(
    flow(sa.getOption, O.chain(O.fromNullable)),
    sa.reverseGet,
  );
}

export function id<A>(): Prism<A, A> {
  return prism(O.some, identity);
}

export function composeIso<A, B, C>(
  left: Prism<A, B>,
  right: Iso<B, C>,
): Prism<A, C> {
  return prism(
    flow(left.getOption, O.map(right.get)),
    flow(right.reverseGet, left.reverseGet),
  );
}

export function composeLens<A, B, C>(
  left: Prism<A, B>,
  right: Lens<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.getOption, O.map(right.get)),
    (b) => (s) =>
      pipe(
        left.getOption(s),
        O.fold(() => s, flow(right.set(b), left.reverseGet)),
      ),
  );
}

export function composePrism<A, B, C>(
  left: Prism<A, B>,
  right: Prism<B, C>,
): Prism<A, C> {
  return prism(
    flow(left.getOption, O.chain(right.getOption)),
    flow(right.reverseGet, left.reverseGet),
  );
}

export function composeOptional<A, B, C>(
  left: Prism<A, B>,
  right: Optional<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.getOption, O.chain(right.getOption)),
    (b) => (s) =>
      pipe(
        left.getOption(s),
        O.fold(() => s, flow(right.set(b), left.reverseGet)),
      ),
  );
}

export function composeTraversal<A, B, C>(
  left: Prism<A, B>,
  right: Traversal<B, C>,
): Traversal<A, C> {
  return ({
    tag: "Traversal",
    traverse: (A) => (fata) => (s) =>
      pipe(
        left.getOption(s),
        O.fold(
          constant(A.of(s)),
          flow(right.traverse(A)(fata), A.map(left.reverseGet)),
        ),
      ),
  });
}

// deno-fmt-ignore
export type Compose<Left, Right> =
  Left extends Prism<infer A, infer B> ?
    Right extends Iso<B, infer C> ? Prism<A, C>
    : Right extends Lens<B, infer C> ? Optional<A, C>
    : Right extends Prism<B, infer C> ? Prism<A, C>
    : Right extends Optional<B, infer C> ? Optional<A, C>
    : Right extends Traversal<B, infer C> ? Traversal<A, C>
    : never
  : never;

// deno-lint-ignore no-explicit-any
type NarrowCompose<R> = R extends Optic<infer B, infer _> ? Prism<any, B>
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
): <S>(sa: Prism<S, A>) => Prism<S, B>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Prism<S, A>) => Prism<S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Prism<S, A>) => Prism<S, A> {
  return (sa) =>
    prism(
      flow(sa.getOption, O.chain(O.fromPredicate(predicate))),
      sa.reverseGet,
    );
}

export function traverse<URI extends URIS>(
  T: T.Traversable<URI>,
): <S, A, B = never, C = never, D = never>(
  sa: Prism<S, Kind<URI, [A, B, C, D]>>,
) => Traversal<S, A> {
  const _traversal = toTraversal(T);
  return (sa) => composeTraversal(sa, _traversal());
}

export function modify<A>(f: (a: A) => A): <S>(sa: Prism<S, A>) => (s: S) => S {
  return (sa) => (s) =>
    pipe(
      sa.getOption(s),
      O.map((a) => {
        const na = f(a);
        return na === a ? s : sa.reverseGet(na);
      }),
      O.getOrElse(() => s),
    );
}

export function map<A, B>(
  ab: (a: A) => B,
  ba: (b: B) => A,
): <S>(sa: Prism<S, A>) => Prism<S, B> {
  return (sa) => prism(flow(sa.getOption, O.map(ab)), flow(ba, sa.reverseGet));
}

export function getSet<S, A>(sa: Prism<S, A>): (a: A) => (s: S) => S {
  return (a) => pipe(sa, modify(constant(a)));
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
  return pipe(lensId<A>(), lensProp(prop), compose);
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Prism<S, A>) => Optional<S, { [K in P]: A[K] }> {
  return pipe(lensId<A>(), lensProps(...props), compose);
}

export function index(
  i: number,
): <S, A>(sa: Prism<S, ReadonlyArray<A>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return compose(indexArray<any>().index(i));
}

export function key(
  key: string,
): <S, A>(sa: Prism<S, Readonly<Record<string, A>>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return compose(indexRecord<any>().index(key));
}

export function atKey(
  key: string,
): <S, A>(
  sa: Prism<S, Readonly<Record<string, A>>>,
) => Optional<S, O.Option<A>> {
  // deno-lint-ignore no-explicit-any
  return compose(atRecord<any>().at(key));
}

export function some<A>(): Prism<O.Option<A>, A> {
  return prism(identity, O.some);
}

export function right<E, A>(): Prism<E.Either<E, A>, A> {
  return prism(E.getRight, E.right);
}

export function left<E, A>(): Prism<E.Either<E, A>, E> {
  return prism(E.getLeft, E.left);
}
