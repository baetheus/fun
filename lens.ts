import type {
  $,
  Kind,
  Predicate,
  Refinement,
  Setoid,
  Traversable,
} from "./types.ts";
import type { Either } from "./either.ts";
import type { Option } from "./option.ts";

import type { Optic } from "./optic.ts";
import type { Iso } from "./iso.ts";
import type { Prism } from "./prism.ts";
import type { Traversal } from "./traversal.ts";
import type { Optional } from "./optional.ts";
import type { ReadonlyRecord } from "./record.ts";

import { toTraversal } from "./traversable.ts";
import { prism } from "./prism.ts";
import { optional } from "./optional.ts";

import * as O from "./option.ts";
import * as E from "./either.ts";
import * as R from "./record.ts";
import * as M from "./map.ts";
import { constant, flow, identity, pipe } from "./fns.ts";

import { indexArray, indexRecord } from "./optional.ts";

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

export type At<S, I, A> = {
  readonly at: (i: I) => Lens<S, A>;
};

export function atRecord<A = never>(): At<
  ReadonlyRecord<A>,
  string,
  Option<A>
> {
  return ({
    at: (key) =>
      lens(
        R.lookupAt(key),
        O.fold(
          () => R.deleteAt(key),
          R.insertAt(key),
        ),
      ),
  });
}

export function atMap<A, B>(
  setoid: Setoid<B>,
): At<ReadonlyMap<B, A>, B, Option<A>> {
  const _lookup = M.lookup(setoid);
  const _deleteAt = M.deleteAt(setoid);
  const _insertAt = M.insertAt(setoid);

  return ({
    at: (key) =>
      lens(
        _lookup(key),
        O.fold(
          () => _deleteAt(key),
          _insertAt(key),
        ),
      ),
  });
}

export function asOptional<S, A>(sa: Lens<S, A>): Optional<S, A> {
  return optional(flow(sa.get, O.some), sa.set);
}

export function asTraversal<S, A>(sa: Lens<S, A>): Traversal<S, A> {
  return ({
    tag: "Traversal",
    traverse: (A) => (fata) => (s) =>
      pipe(fata(sa.get(s)), A.map((a: A) => sa.set(a)(s))),
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

export function composeIso<A, B, C>(
  left: Lens<A, B>,
  right: Iso<B, C>,
): Lens<A, C> {
  return lens(
    flow(left.get, right.get),
    flow(right.reverseGet, left.set),
  );
}

export function composeLens<A, B, C>(
  left: Lens<A, B>,
  right: Lens<B, C>,
): Lens<A, C> {
  return lens(
    flow(left.get, right.get),
    (b) => (s) => left.set(right.set(b)(left.get(s)))(s),
  );
}

export function composePrism<A, B, C>(
  left: Lens<A, B>,
  right: Prism<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.get, right.getOption),
    flow(right.reverseGet, left.set),
  );
}

export function composeOptional<A, B, C>(
  left: Lens<A, B>,
  right: Optional<B, C>,
): Optional<A, C> {
  return optional(
    flow(left.get, right.getOption),
    (b) => (s) => pipe(left.get(s), right.set(b), left.set)(s),
  );
}

export function composeTraversal<A, B, C>(
  left: Lens<A, B>,
  right: Traversal<B, C>,
): Traversal<A, C> {
  return ({
    tag: "Traversal",
    traverse: (A) => (fata) => (s) =>
      pipe(
        right.traverse(A)(fata)(left.get(s)),
        A.map((a: B) => left.set(a)(s)),
      ),
  });
}

// deno-fmt-ignore
export type Compose<Left, Right> =
  Left extends Lens<infer A, infer B> ?
    Right extends Iso<B, infer C> ? Lens<A, C>
    : Right extends Lens<B, infer C> ? Lens<A, C>
    : Right extends Prism<B, infer C> ? Optional<A, C>
    : Right extends Optional<B, infer C> ? Optional<A, C>
    : Right extends Traversal<B, infer C> ? Traversal<A, C>
    : never
  : never;

// deno-lint-ignore no-explicit-any
type NarrowCompose<R> = R extends Optic<infer B, infer _> ? Lens<any, B>
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
  return (sa) => (s) => {
    const o = sa.get(s);
    const n = f(o);
    return o === n ? s : sa.set(n)(s);
  };
}

export function map<A, B>(
  ab: (a: A) => B,
  ba: (b: B) => A,
): <S>(sa: Lens<S, A>) => Lens<S, B> {
  return (sa) => lens(flow(sa.get, ab), flow(ba, sa.set));
}

export function traverse<U extends Kind>(
  T: Traversable<U>,
): <S, A, B = never, C = never, D = never, E = never>(
  sa: Lens<S, $<U, [A, B, C], [D], [E]>>,
) => Traversal<S, A> {
  const _traversal = toTraversal(T);
  return (sa) => composeTraversal(sa, _traversal());
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
  return (sa) => composeOptional(sa, indexArray<any>().index(i));
}

export function key(
  key: string,
): <S, A>(sa: Lens<S, Readonly<Record<string, A>>>) => Optional<S, A> {
  // deno-lint-ignore no-explicit-any
  return compose(indexRecord<any>().index(key));
}

export function atKey(
  key: string,
): <S, A>(sa: Lens<S, Readonly<Record<string, A>>>) => Lens<S, O.Option<A>> {
  // deno-lint-ignore no-explicit-any
  return compose(atRecord<any>().at(key));
}

export function some<S, A>(soa: Lens<S, O.Option<A>>): Optional<S, A> {
  return composePrism(soa, prism(identity, O.some));
}

export function right<S, E, A>(sea: Lens<S, Either<E, A>>): Optional<S, A> {
  return composePrism(sea, prism(E.getRight, E.right));
}

export function left<S, E, A>(sea: Lens<S, Either<E, A>>): Optional<S, E> {
  return composePrism(sea, prism(E.getLeft, E.left));
}
