import type * as T from "./types.ts";
import type { Kind, URIS } from "./kind.ts";
import type { Predicate, Refinement } from "./types.ts";
import type { Either } from "./either.ts";
import type { Iso } from "./iso.ts";
import type { Prism } from "./prism.ts";
import type { Traversal } from "./traversal.ts";
import type { Optional } from "./optional.ts";

import { fromTraversable } from "./from_traversable.ts";
import { prism } from "./prism.ts";
import { optional } from "./optional.ts";

import * as O from "./option.ts";
import * as E from "./either.ts";
import * as R from "./record.ts";
import { constant, flow, identity, pipe } from "./fns.ts";

import { atRecord } from "./at.ts";
import { indexArray, indexRecord } from "./index.ts";

export type Lens<S, A> = {
  readonly tag: "Lens";
  readonly get: (s: S) => A;
  readonly set: (a: A) => (s: S) => S;
};

export type From<T> = T extends Lens<infer S, infer _> ? S : never;

export type To<T> = T extends Lens<infer _, infer A> ? A : never;

export function lens<S, A>(
  get: (s: S) => A,
  set: (a: A) => (s: S) => S,
): Lens<S, A> {
  return ({ tag: "Lens", get, set });
}

export function asOptional<S, A>(sa: Lens<S, A>): Optional<S, A> {
  return optional(flow(sa.get, O.some), sa.set);
}

export function asTraversal<S, A>(sa: Lens<S, A>): Traversal<S, A> {
  return ({
    tag: "Traversal",
    traverse: (A) =>
      (fata) => (s) => pipe(fata(sa.get(s)), A.map((a: A) => sa.set(a)(s))),
  });
}

export function fromNullable<S, A>(
  sa: Lens<S, A>,
): Optional<S, NonNullable<A>> {
  return optional(flow(sa.get, O.fromNullable), sa.set);
}

export function id<A>(): Lens<A, A> {
  return lens(identity, constant);
}

export function compose<J, K>(
  jk: Lens<J, K>,
): <I>(ij: Lens<I, J>) => Lens<I, K> {
  return (ij) =>
    lens(
      flow(ij.get, jk.get),
      (b) => (s) => ij.set(jk.set(b)(ij.get(s)))(s),
    );
}

export function composeIso<A, B>(
  ab: Iso<A, B>,
): <S>(sa: Lens<S, A>) => Lens<S, B> {
  return (sa) =>
    lens(
      flow(sa.get, ab.get),
      flow(ab.reverseGet, sa.set),
    );
}

export function composePrism<A, B>(
  ab: Prism<A, B>,
): <S>(sa: Lens<S, A>) => Optional<S, B> {
  return (sa) =>
    optional(flow(sa.get, ab.getOption), flow(ab.reverseGet, sa.set));
}

export function composeOptional<A, B>(
  ab: Optional<A, B>,
): <S>(sa: Lens<S, A>) => Optional<S, B> {
  return (sa) =>
    optional(
      flow(sa.get, ab.getOption),
      (b) => (s) => pipe(sa.get(s), ab.set(b), sa.set)(s),
    );
}

export function composeTraversal<A, B>(
  ab: Traversal<A, B>,
): <S>(sa: Lens<S, A>) => Traversal<S, B> {
  return (sa) => ({
    tag: "Traversal",
    traverse: (A) =>
      (fata) =>
        (s) =>
          pipe(ab.traverse(A)(fata)(sa.get(s)), A.map((a: A) => sa.set(a)(s))),
  });
}

export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): <S>(sa: Lens<S, A>) => Optional<S, B>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Lens<S, A>) => Optional<S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <S>(sa: Lens<S, A>) => Optional<S, A> {
  return (sa) => optional(flow(sa.get, O.fromPredicate(predicate)), sa.set);
}

export function modify<A>(f: (a: A) => A): <S>(sa: Lens<S, A>) => (s: S) => S {
  return (sa) =>
    (s) => {
      const o = sa.get(s);
      const n = f(o);
      return o === n ? s : sa.set(n)(s);
    };
}

export function traverse<URI extends URIS>(
  T: T.Traversable<URI>,
): <S, A, B = never, C = never, D = never>(
  sa: Lens<S, Kind<URI, [A, B, C, D]>>,
) => Traversal<S, A> {
  const _traversal = fromTraversable(T);
  return (sa) => pipe(sa, composeTraversal(_traversal()));
}

export function prop<A, P extends keyof A>(
  prop: P,
): <S>(sa: Lens<S, A>) => Lens<S, A[P]> {
  return (sa) =>
    lens(
      flow(sa.get, (a) => a[prop]),
      (ap) => (s) => sa.set({ ...sa.get(s), [prop]: ap })(s),
    );
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Lens<S, A>) => Lens<S, { [K in P]: A[K] }> {
  return (sa) =>
    lens(
      flow(sa.get, R.pick(props)),
      (a) => (s) => sa.set({ ...sa.get(s), ...a })(s),
    );
}

export function index(
  i: number,
): <S, A>(sa: Lens<S, ReadonlyArray<A>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return composeOptional(indexArray<any>().index(i));
}

export function key(
  key: string,
): <S, A>(sa: Lens<S, Readonly<Record<string, A>>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return composeOptional(indexRecord<any>().index(key));
}

export function atKey(
  key: string,
): <S, A>(sa: Lens<S, Readonly<Record<string, A>>>) => Lens<S, O.Option<A>> {
  // deno-lint-ignore no-explicit-any
  return compose(atRecord<any>().at(key));
}

export function some<S, A>(soa: Lens<S, O.Option<A>>): Optional<S, A> {
  return pipe(soa, composePrism(prism(identity, O.some)));
}

export function right<S, E, A>(sea: Lens<S, Either<E, A>>): Optional<S, A> {
  return pipe(sea, composePrism(prism(E.getRight, E.right)));
}

export function left<S, E, A>(sea: Lens<S, Either<E, A>>): Optional<S, E> {
  return pipe(sea, composePrism(prism(E.getLeft, E.left)));
}
