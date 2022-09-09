import type * as T from "./types.ts";
import type { Kind, URIS } from "./kind.ts";
import type { Predicate, Refinement } from "./types.ts";
import type { Either } from "./either.ts";
import type { Option } from "./option.ts";

import type { Optic } from "./optic.ts";
import type { Iso } from "./iso.ts";
import type { Lens } from "./lens.ts";
import type { Prism } from "./prism.ts";
import type { Traversal } from "./traversal.ts";

import { fromTraversable } from "./from_traversable.ts";

import * as O from "./option.ts";
import * as E from "./either.ts";
import * as A from "./array.ts";
import * as R from "./record.ts";
import * as M from "./map.ts";
import { apply, constant, flow, identity, pipe } from "./fns.ts";

import {
  atRecord,
  id as lensId,
  prop as lensProp,
  props as lensProps,
} from "./lens.ts";

export type Optional<S, A> = {
  readonly tag: "Optional";
  readonly getOption: (s: S) => Option<A>;
  readonly set: (a: A) => (s: S) => S;
};

export type From<T> = T extends Optional<infer S, infer _> ? S : never;

export type To<T> = T extends Optional<infer _, infer A> ? A : never;

export type Index<S, I, A> = {
  readonly index: (i: I) => Optional<S, A>;
};

export function optional<S, A>(
  getOption: (s: S) => Option<A>,
  set: (a: A) => (s: S) => S,
): Optional<S, A> {
  return { tag: "Optional", getOption, set };
}

export function indexArray<A>(): Index<ReadonlyArray<A>, number, A> {
  return ({
    index: (key) =>
      optional(
        A.lookup(key),
        A.updateAt(key),
      ),
  });
}

export function indexRecord<A>(): Index<
  R.ReadonlyRecord<A>,
  string,
  A
> {
  return ({
    index: (key) => {
      const lookup = R.lookup(key);
      return optional(
        lookup,
        R.updateAt(key),
      );
    },
  });
}

export function indexMap<A, B>(setoid: T.Setoid<B>): Index<Map<B, A>, B, A> {
  const lookup = M.lookup(setoid);
  const updateAt = M.updateAt(setoid);
  return ({
    index: (key) =>
      optional(
        lookup(key),
        updateAt(key),
      ),
  });
}

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
  return optional(
    flow(sa.getOption, O.chain(O.fromNullable)),
    sa.set,
  );
}

export function id<A>(): Optional<A, A> {
  return optional(O.some, constant);
}

export function composeIso<A, B, C>(
  left: Optional<A, B>,
  right: Iso<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.getOption, O.map(right.get)),
    flow(right.reverseGet, left.set),
  );
}

export function composeLens<A, B, C>(
  left: Optional<A, B>,
  right: Lens<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.getOption, O.map(right.get)),
    (b) =>
      (s) =>
        pipe(
          left.getOption(s),
          O.map(right.set(b)),
          O.fold(constant(s), flow(left.set, (fa) => fa(s))),
        ),
  );
}

export function composePrism<A, B, C>(
  left: Optional<A, B>,
  right: Prism<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.getOption, O.chain(right.getOption)),
    flow(right.reverseGet, left.set),
  );
}

export function composeOptional<A, B, C>(
  left: Optional<A, B>,
  right: Optional<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.getOption, O.chain(right.getOption)),
    (b) =>
      (s) =>
        pipe(
          left.getOption(s),
          O.map(right.set(b)),
          O.fold(() => identity, left.set),
        )(s),
  );
}

export function composeTraversal<A, B, C>(
  left: Optional<A, B>,
  right: Traversal<B, C>,
): Traversal<A, C> {
  return ({
    tag: "Traversal",
    traverse: (T) =>
      (fata) =>
        (s) =>
          pipe(
            left.getOption(s),
            O.fold(
              constant(T.of(s)),
              flow(right.traverse(T)(fata), T.map(flow(left.set, apply(s)))),
            ),
          ),
  });
}

// deno-fmt-ignore
export type Compose<Left, Right> =
  Left extends Optional<infer A, infer B> ?
    Right extends Iso<B, infer C> ? Iso<A, C>
    : Right extends Lens<B, infer C> ? Lens<A, C>
    : Right extends Prism<B, infer C> ? Prism<A, C>
    : Right extends Optional<B, infer C> ? Optional<A, C>
    : Right extends Traversal<B, infer C> ? Traversal<A, C>
    : never
  : never;

// deno-lint-ignore no-explicit-any
type NarrowCompose<R> = R extends Optic<infer B, infer _> ? Optional<any, B>
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
): <S>(sa: Optional<S, A>) => Optional<S, B>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Optional<S, A>) => Optional<S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Optional<S, A>) => Optional<S, A> {
  return (sa) =>
    optional(
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

export function map<A, B>(
  ab: (a: A) => B,
  ba: (b: B) => A,
): <S>(sa: Optional<S, A>) => Optional<S, B> {
  return (sa) =>
    optional(
      flow(sa.getOption, O.map(ab)),
      flow(ba, sa.set),
    );
}

export function traverse<URI extends URIS>(
  T: T.Traversable<URI>,
): <S, A, B = never, C = never, D = never>(
  sa: Optional<S, Kind<URI, [A, B, C, D]>>,
) => Traversal<S, A> {
  const _traversal = fromTraversable(T);
  return (sa) => composeTraversal(sa, _traversal());
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Optional<S, A>) => Optional<S, A[P]> {
  const _prop = pipe(lensId<A>(), lensProp(prop));
  return (sa) => composeLens(sa, _prop);
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Optional<S, A>) => Optional<S, { [K in P]: A[K] }> {
  const _props = pipe(lensId<A>(), lensProps(...props));
  return (sa) => composeLens(sa, _props);
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
  return (sa) => composeLens(sa, atRecord<any>().at(key));
}

export function some<S, A>(soa: Optional<S, Option<A>>): Optional<S, A> {
  return composeOptional(soa, optional(identity, flow(O.some, constant)));
}

export function right<S, E, A>(sea: Optional<S, Either<E, A>>): Optional<S, A> {
  return composeOptional(sea, optional(E.getRight, flow(E.right, constant)));
}

export function left<S, E, A>(sea: Optional<S, Either<E, A>>): Optional<S, E> {
  return composeOptional(sea, optional(E.getLeft, flow(E.left, constant)));
}
