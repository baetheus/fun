/*
 * Optics are a collection of combinators for focusing on specific parts of data
 * within an existing structure. The core operations are view, review, and
 * modify. Optics in the fun library are based on the concept of Kliesli optics
 * as outlined
 * [here](https://gist.github.com/serras/5152ec18ec5223b676cc67cac0e99b70).
 *
 * Their uses include (but are not limited to):
 * * Accessing deeply nested data
 * * Mapping related but distinct types without loss of fidelity
 * * Immutably modifying large data structures
 *
 * At its core, instead of separating the view method into view, preview, and
 * toList of, as is done in many languages and libraries. This implementation
 * uses a single view method that operates as a Kliesli arrow (a -> mb) where
 * the m in this case is limited to the Identity, Option, and Array monads,
 * which can be composed using Natural transformations and flatMap.
 *
 * In addition to view, there are also implementations of review and modify,
 * which also have composition functions.. but the research for composition is
 * not yet complete for review.
 *
 * In any case, this implementation of optics is distinct from Laarhoven lenses
 * and profunctor optics, and is much more compact and performant in typescript
 * than those implementations.
 *
 * @module Optics
 * @since 2.0.0
 */
import type { $, In, Kind, Out } from "./kind.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Tree } from "./tree.ts";
import type { Either } from "./either.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Eq } from "./eq.ts";
import type { Traversable } from "./traversable.ts";

import * as I from "./identity.ts";
import * as O from "./option.ts";
import * as A from "./array.ts";
import * as R from "./record.ts";
import * as E from "./either.ts";
import * as M from "./map.ts";
import * as P from "./pair.ts";
import { TraversableSet } from "./set.ts";
import { TraversableTree } from "./tree.ts";
import { isNotNil } from "./nilable.ts";
import { concatAll as getConcatAll } from "./monoid.ts";
import { dimap, flow, identity, over, pipe } from "./fn.ts";

/**
 * Following are the runtime tags associated
 * with various forms of Optics.
 */

const LensTag = "Lens" as const;
type LensTag = typeof LensTag;

const AffineTag = "Affine" as const;
type AffineTag = typeof AffineTag;

const FoldTag = "Fold" as const;
type FoldTag = typeof FoldTag;

type Tag = LensTag | AffineTag | FoldTag;

/**
 * Type level mapping from Tag to URI. Since an
 * Optic get function is a Kliesli Arrow a => mb, we
 * associate the Optic Tags as follows:
 *
 * LensTag => Identity
 * AffineTag => Option
 * FoldTag => Array
 */
type ToURI<T extends Tag> = T extends LensTag ? I.URI
  : T extends AffineTag ? O.KindOption
  : T extends FoldTag ? A.URI
  : never;

export type Viewer<T extends Tag, S, A> = {
  readonly tag: T;
  readonly view: (s: S) => $<ToURI<T>, [A, never, never]>;
};

export interface KindViewer extends Kind {
  readonly kind: Viewer<Tag, In<this, 0>, Out<this, 0>>;
}

export function viewer<T extends Tag, S, A>(
  tag: T,
  view: (s: S) => $<ToURI<T>, [A, never, never]>,
): Viewer<T, S, A> {
  return { tag, view };
}

export type Modifier<S, A> = {
  readonly modify: (modifyFn: (a: A) => A) => (s: S) => S;
};

export type Reviewer<S, A> = {
  readonly review: (a: A) => S;
};

/**
 * Our new Optic definition. Instead of get and set we use get and modify as
 * set can be derived from modify(() => value). This drastically simplifies
 * implementation.
 */
export type Optic<T extends Tag, S, A> = Viewer<T, S, A> & Modifier<S, A>;

export function optic<U extends Tag, S, A>(
  tag: U,
  view: (s: S) => $<ToURI<U>, [A, never, never]>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Optic<U, S, A> {
  return { tag, view, modify };
}

/**
 * We recover the Lens type from the generic Optic
 */
export type Lens<S, A> = Optic<LensTag, S, A>;

/**
 * Construct a Lens from get and modify functions.
 */
export function lens<S, A>(
  view: (s: S) => A,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Lens<S, A> {
  return optic(LensTag, view, modify);
}

/**
 * We recover the Iso type from the Lens and Reviewer types
 */
export type Iso<S, A> = Lens<S, A> & Reviewer<S, A>;

/**
 * Construct an Iso from view and review functions
 */
export function iso<S, A>(view: (s: S) => A, review: (a: A) => S): Iso<S, A> {
  return { tag: LensTag, view, review, modify: dimap(view, review) };
}

/**
 * We recover the AffineFold type from the generic Optic
 */
export type AffineFold<S, A> = Optic<AffineTag, S, A>;

/**
 * Construct a AffineFold from get and modify functions.
 */
export function affineFold<S, A>(
  view: (s: S) => Option<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): AffineFold<S, A> {
  return optic(AffineTag, view, modify);
}

/**
 * We recover the Prism type from the AffineFold and Reviewr types
 */
export type Prism<S, A> = AffineFold<S, A> & Reviewer<S, A>;

/**
 * Construct a Prism from view and review functions.
 */
export function prism<S, A>(
  view: (s: S) => Option<A>,
  review: (a: A) => S,
): Prism<S, A> {
  return {
    tag: AffineTag,
    view,
    review,
    modify: (modifyFn) => (s) =>
      pipe(view(s), O.map(modifyFn), O.match(() => s, review)),
  };
}
/**
 * We recover the Fold type from the generic Optic
 */
export type Fold<S, A> = Optic<FoldTag, S, A>;

/**
 * Construct a Fold from get and modify functions.
 */
export function fold<S, A>(
  view: (s: S) => ReadonlyArray<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Fold<S, A> {
  return optic(FoldTag, view, modify);
}

/**
 * Align will give us the "loosest" of two tags. This is used to
 * determine the abstraction level that an Optic operatates at. The
 * most contstrained is Identity while the least constrained is Array.
 * The typescript version of the source optics Lenss are as follows:
 *
 * ```ts
 * import type { Identity } from "./identity.ts";
 * import type { Option } from "./option.ts";
 *
 * type Lens<S, A>      = { get: (s: S) => Identity<A> };
 * type AffineFold<S, A>     = { get: (s: S) =>   Option<A> };
 * type Fold<S, A> = { get: (s: S) =>    Array<A> };
 * ```
 *
 * Here we can see that Lens is constrained to get exactly one A,
 * AffineFold is constrained to get zero or one A, and Fold is
 * constrained to get zero, one, or many As. Because of this,
 * Lens can always be lifted to a AffineFold and AffineFold can always be
 * lifted to Fold. All Optics share the same modify function
 * over S and A.
 *
 * Thus Align is like GT where Array > Option > Identity.
 */
type Align<U extends Tag, V extends Tag> = U extends FoldTag ? FoldTag
  : V extends FoldTag ? FoldTag
  : U extends AffineTag ? AffineTag
  : V extends AffineTag ? AffineTag
  : LensTag;

/**
 * The runtime level GTE for Align
 */
function align<A extends Tag, B extends Tag>(
  a: A,
  b: B,
): Align<A, B> {
  return ((a === FoldTag || b === FoldTag)
    ? FoldTag
    : (a === AffineTag || b === AffineTag)
    ? AffineTag
    : LensTag) as Align<A, B>;
}

/**
 * Create a view function from a Viewer<U, S, A> and
 * a tag V. In the case where U and V match this is
 * a noop, returning the view function from the input
 * Viewer. Otherwise this uses hand coded Natural
 * Transformations for:
 *
 * Identity<A> -> Option<A>
 * Identity<A> -> ReadonlyArray<A>
 * Option<A> -> ReadonlyArray<A>
 *
 * This cast is unable to downcast from Array or Option and
 * will throw a runtime error if that is attempted.
 * Because of this, the cast function is not exported and
 * is only used in compose and ap, where two tags are
 * aligned prior to casting.
 */
function cast<U extends Tag, V extends Tag, S, A>(
  viewer: Viewer<U, S, A>,
  tag: V,
): Viewer<V, S, A>["view"] {
  type Out = Viewer<V, S, A>["view"];
  // Covers Lens => Lens, AffineFold => AffineFold, Fold => Fold
  if (viewer.tag === tag as LensTag) {
    return viewer.view as Out;
    // AffineFold => Fold
  } else if (tag === FoldTag && viewer.tag === AffineTag) {
    return (s: S) => {
      const ua = viewer.view(s) as Option<A>;
      return (O.isNone(ua) ? [] : [ua.value]) as ReturnType<Out>;
    };
    // Lens => Fold
  } else if (tag === FoldTag && viewer.tag === LensTag) {
    return (s: S) => [viewer.view(s)] as ReturnType<Out>;
    // Lens => AffineFold
  } else if (tag === AffineTag && viewer.tag == LensTag) {
    return (s) => O.of(viewer.view(s)) as ReturnType<Out>;
  }
  // Non-valid casts will throw an error at runtime.
  // This is not reachable with the combinators in this lib.
  throw new Error(`Attempted to cast ${viewer.tag} to ${tag}`);
}

function getMonad<T extends Tag>(tag: T): Monad<ToURI<T>> {
  return (tag === FoldTag
    ? A.MonadArray
    : tag === AffineTag
    ? O.MonadOption
    : I.MonadIdentity) as unknown as Monad<ToURI<T>>;
}

// deno-lint-ignore no-explicit-any
const _identity: Lens<any, any> = lens(identity, identity);

/**
 * The starting place for most Optics. Create an Optic over the
 * identity function.
 */
export function id<A>(): Lens<A, A> {
  return _identity;
}

/**
 * Compose two Optics by:
 *
 * 1. Finding the alignment of them, which is Max<first, second> where
 *    Fold > AffineFold > Get
 * 2. Cast both optics to the alignment tag, one cast will always be
 *    a noop.
 * 3. Construct a new optic by chaining the view functions first to
 *    second and composing the modify functions second to first.
 */
export function compose<V extends Tag, A, I>(second: Optic<V, A, I>) {
  return <U extends Tag, S>(
    first: Optic<U, S, A>,
  ): Optic<Align<U, V>, S, I> => {
    const tag = align(first.tag, second.tag);
    const _chain = getMonad(tag).chain;
    const _first = cast(first, tag);
    const _second = cast(second, tag);
    return optic(
      tag,
      flow(_first, _chain(_second)),
      flow(second.modify, first.modify),
    );
  };
}

export function of<A, S = unknown>(a: A): Viewer<LensTag, S, A> {
  return viewer(LensTag, (_: S) => a);
}

export function map<A, I>(
  fai: (a: A) => I,
): <T extends Tag, S>(first: Viewer<T, S, A>) => Viewer<T, S, I> {
  return ({ tag, view }) => {
    const _map = getMonad(tag).map;
    return viewer(tag, flow(view, _map(fai)));
  };
}

export function ap<V extends Tag, S, A>(
  second: Viewer<V, S, A>,
): <U extends Tag, I>(
  first: Viewer<U, S, (a: A) => I>,
) => Viewer<Align<U, V>, S, I> {
  return (first) => {
    const tag = align(first.tag, second.tag);
    const _ap = getMonad(tag).ap;
    const _first = cast(first, tag);
    const _second = cast(second, tag);
    return viewer(tag, (s) => pipe(_first(s), _ap(_second(s))));
  };
}

/**
 * Invariant map over the focus of an existing Optic.
 */
export function imap<A, I>(
  fai: (a: A) => I,
  fia: (i: I) => A,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, LensTag>, S, I> {
  return compose(lens(fai, dimap(fai, fia)));
}

/**
 * Construct a AffineFold from a Predicate or a Refinement.
 */
export function fromPredicate<S, A extends S>(
  refinement: Refinement<S, A>,
): AffineFold<S, A>;
export function fromPredicate<A>(predicate: Predicate<A>): AffineFold<A, A>;
export function fromPredicate<A>(predicate: Predicate<A>): AffineFold<A, A> {
  return affineFold(O.fromPredicate(predicate), identity);
}

/**
 * Construct a Lens<S, A> from an Iso<S, A>;
 */
export function fromIso<S, A>({ view, review }: Iso<S, A>): Lens<S, A> {
  return lens(view, dimap(view, review));
}

/**
 * Given an Optic over a structure with a property P, construct a
 * new Optic at that property P.
 */
export function prop<A, P extends keyof A>(
  prop: P,
): <U extends Tag, S>(
  sa: Optic<U, S, A>,
) => Optic<Align<U, LensTag>, S, A[P]> {
  return compose(
    lens((s) => s[prop], (fii) => (a) => {
      const out = fii(a[prop]);
      return a[prop] === out ? a : { ...a, [prop]: out };
    }),
  );
}

/**
 * Given an Optic over a structure with properties P, construct a new
 * optic that only focuses on those properties
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, LensTag>, S, { [K in P]: A[K] }> {
  const pick = R.pick<A, P>(...props);
  return compose(lens(
    pick,
    (faa) => (a) => {
      const out = faa(pick(a));
      return props.every((prop) => a[prop] === out[prop])
        ? a
        : { ...a, ...out };
    },
  ));
}

/**
 * Given an optic over an array, focus on a value at an index in the
 * array.
 */
export function index(
  i: number,
): <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyArray<A>>,
) => Optic<Align<U, AffineTag>, S, A> {
  return compose(affineFold(A.lookup(i), A.modifyAt(i)));
}

/**
 * Given an optic over a record, focus on a value at a key in that
 * record.
 */
export function key(
  key: string,
): <U extends Tag, S, A>(
  first: Optic<U, S, Readonly<Record<string, A>>>,
) => Optic<Align<U, AffineTag>, S, A> {
  return compose(affineFold(R.lookupAt(key), R.modifyAt(key)));
}

/**
 * Given an Optic focused on A, filter out or refine that A.
 */
export function filter<A, B extends A>(
  r: Refinement<A, B>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, AffineTag>, S, B>;
export function filter<A>(
  r: Predicate<A>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, AffineTag>, S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, AffineTag>, S, A> {
  return compose(
    affineFold(
      O.fromPredicate(predicate),
      (fii) => (a) => predicate(a) ? fii(a) : a,
    ),
  );
}

/**
 * Traverse a U using a Traversable for U. By construction
 * get for a Fold will return an array of values.
 */
export function traverse<T extends Kind>(
  T: Traversable<T>,
): <U extends Tag, S, A, B, C, D, E>(
  first: Optic<U, S, $<T, [A, B, C], [D], [E]>>,
) => Optic<Align<U, FoldTag>, S, A> {
  return compose(
    fold(
      T.reduce((as, a) => as.concat(a), A.empty()),
      T.map,
    ),
  );
}

export function view<S>(
  s: S,
): <U extends Tag, A>(
  viewer: Viewer<U, S, A>,
) => ReturnType<typeof viewer.view> {
  return (viewer) => viewer.view(s);
}

export function modify<A>(faa: (a: A) => A): <S>(
  modifier: Modifier<S, A>,
) => ReturnType<typeof modifier.modify> {
  return (modifier) => modifier.modify(faa);
}

export function replace<A>(a: A): <S>(
  modifier: Modifier<S, A>,
) => ReturnType<typeof modifier.modify> {
  const value = () => a;
  return (modifier) => modifier.modify(value);
}

/**
 * Given an optic over a record, focus on an Option(value) at
 * the given key, allowing one to delete the key by modifying
 * with a None value.
 */
export function atKey(
  key: string,
): <U extends Tag, S, A>(
  first: Optic<U, S, Readonly<Record<string, A>>>,
) => Optic<Align<U, LensTag>, S, Option<A>> {
  const lookup = R.lookupAt(key);
  const _deleteAt = R.deleteAt(key);
  const deleteAt = () => _deleteAt;
  const insertAt = R.insertAt(key);
  return compose(
    lens(
      lookup,
      (faa) => over(flow(lookup, faa, O.match(deleteAt, insertAt))),
    ),
  );
}

/**
 * Construct an Optic over a ReadonlyMap that
 * can lookup a value by key.
 */
export function atMap<B>(
  eq: Eq<B>,
): (
  key: B,
) => <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyMap<B, A>>,
) => Optic<Align<U, LensTag>, S, Option<A>> {
  return (key: B) => {
    const lookup = M.lookup(eq)(key);
    const _deleteAt = M.deleteAt(eq)(key);
    const deleteAt = () => _deleteAt;
    const insertAt = M.insertAt(eq)(key);
    return compose(lens(
      lookup,
      (faa) => over(flow(lookup, faa, O.match(deleteAt, insertAt))),
    ));
  };
}

/**
 * Collect all values focused on by an Optic into an Array, convert
 * them into a type I, and concat them using the passed Monoid.
 */
export function concatAll<A, I>(M: Monoid<I>, fai: (a: A) => I) {
  const _concatAll = getConcatAll(M);
  return <U extends Tag, S>(first: Optic<U, S, A>): (s: S) => I => {
    const view = cast(first, FoldTag);
    return flow(view, A.map(fai), _concatAll);
  };
}

/**
 * Construct an Optic over the values of a ReadonlyRecord<A>
 */
export const record: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyRecord<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(R.TraversableRecord);
/**
 * Construct an Optic over the values of a ReadonlyArray<A>
 */
export const array: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyArray<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(A.TraversableArray);

/**
 * Construct an Optic over the values of a ReadonlySet<A>
 */
export const set: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlySet<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(TraversableSet);

/**
 * Construct an Optic over the values of a Tree<A>
 */
export const tree: <U extends Tag, S, A>(
  first: Optic<U, S, Tree<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(TraversableTree);

/**
 * Wrap an Optic that focuses on a value that can be null or undefined
 * such that it focuses only on non-null values
 */
export const nilable: <U extends Tag, S, A>(
  first: Optic<U, S, A>,
) => Optic<Align<U, AffineTag>, S, NonNullable<A>> = filter(isNotNil);

/**
 * Given an optic focused on an Option<A>, construct
 * an Optic focused within the Option.
 */
export const some: <U extends Tag, S, A>(
  optic: Optic<U, S, Option<A>>,
) => Optic<Align<U, AffineTag>, S, A> = compose(affineFold(identity, O.map));

/**
 * Given an optic focused on an Either<B, A>, construct
 * an Optic focused on the Right value of the Either.
 */
export const right: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Align<U, AffineTag>, S, A> = compose(
  affineFold(E.getRight, E.map),
);

/**
 * Given an optic focused on an Either<B, A>, construct
 * an Optic focused on the Left value of the Either.
 */
export const left: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Align<U, AffineTag>, S, B> = compose(
  affineFold(E.getLeft, E.mapLeft),
);

/**
 * Given an optic focused on an Pair<A, B>, construct
 * an Optic focused on the First value of the Pair.
 */
export const first: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Align<U, LensTag>, S, A> = compose(lens(P.getFirst, P.map));

/**
 * Given an optic focused on an Pair<A, B>, construct
 * an Optic focused on the Second value of the Pair.
 */
export const second: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Align<U, LensTag>, S, B> = compose(lens(P.getSecond, P.mapLeft));
