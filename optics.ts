/**
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
 *
 * @since 2.0.0
 */
import type { $, Kind } from "./kind.ts";
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
 * A runtime tag and type that indicates an Optic has a view function of the form
 * `(s: S) => Identity<A>`.
 */
export const LensTag = "Lens" as const;
export type LensTag = typeof LensTag;

/**
 * A runtime tag and type that indicates an Optic has a view function of the form
 * `(s: S) => Option<A>`.
 */
export const AffineTag = "Affine" as const;
export type AffineTag = typeof AffineTag;

/**
 * A runtime tag and type that indicates an Optic has a view function of the form
 * `(s: S) => ReadonlyArray<A>`.
 */
export const FoldTag = "Fold" as const;
export type FoldTag = typeof FoldTag;

/**
 * A type union of the supported view tags for a Viewer
 */
export type Tag = LensTag | AffineTag | FoldTag;

/**
 * A type level mapping from an Optic Tag to its associated output Kind. This is
 * used to substitute the container of the output of a view function.
 */
type ToKind<T extends Tag> = T extends LensTag ? I.KindIdentity
  : T extends AffineTag ? O.KindOption
  : T extends FoldTag ? A.KindArray
  : never;
/**
 * A type level computation of Optic Tags. When composing the view functions of
 * two optics their output types must be aligned. This type aligns their tags at
 * the type level. It has a corresponding runtime align function.
 */
type Align<U extends Tag, V extends Tag> = U extends FoldTag ? FoldTag
  : V extends FoldTag ? FoldTag
  : U extends AffineTag ? AffineTag
  : V extends AffineTag ? AffineTag
  : LensTag;

/**
 * A runtime computation over Optic Tags. When composing two optics, the output
 * of their view functions must be aligned. This does that aligning. In general,
 * it operates like the Math.max function but for LensTag, AffineTag, and
 * FoldTag. Specifically, FoldTag > AffineTag > LensTag.
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
 * Given a Viewer<U, S, A> and an optic tag V, this function produces a view
 * function that can be used in a Viewer<V, S, A>. However, not all casts are valid.
 * The following are the only supported casts, by their optic tag:
 *
 * * LensTag => LensTag
 * * LensTag => AffineTag
 * * LensTag => FoldTag
 * * AffineTag => AffineTag
 * * AffineTag => FoldTag
 * * FoldTag => FoldTag
 *
 * The following are unsupported casts which will throw at runtime:
 *
 * * AffineTag => LensTag
 * * FoldTag => AffineTag
 * * FoldTag => LensTag
 *
 * This library has no code that leads to unsupported casts, but if one wishes
 * to extend its functionality by replicating the cast logic, these cases must
 * be considered.
 */
export function _unsafeCast<U extends Tag, V extends Tag, S, A>(
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

/**
 * Recover a Monad from an Optic Tag. The following cases are handled:
 *
 * * LensTag => MonadIdentity
 * * AffineTag => MonadOption
 * * FoldTag => MonadArray
 */
function getMonad<T extends Tag>(tag: T): Monad<ToKind<T>> {
  return (tag === FoldTag
    ? A.MonadArray
    : tag === AffineTag
    ? O.MonadOption
    : I.MonadIdentity) as unknown as Monad<ToKind<T>>;
}

/**
 * A Viewer<T, S, A> implements a view function `(s: S) => T<A>`. This is
 * effectively a Kliesli Arrow. The valid types of T are Identity, Option, and
 * Array. Viewer also includes a runtime tag corresponding to the return type of
 * the view function to aid in composition.
 *
 * @since 2.0.0
 */
export interface Viewer<T extends Tag, S, A> {
  readonly tag: T;
  readonly view: (s: S) => $<ToKind<T>, [A, never, never]>;
}

/**
 * The Modifier<S, A> type implements the modify function
 * `(mod: (a: A) => A) => (s: S) => S`. This type is directly composable and
 * from it one can recover set/replace behavior.
 *
 * @since 2.0.0
 */
export interface Modifier<S, A> {
  readonly modify: (modifyFn: (a: A) => A) => (s: S) => S;
}

/**
 * The Reviewer<S, A. type implements the review function `(a: A) => S`. This
 * type is directly composable and is used when the S type in Viewer<U, S, A>
 * can be reconstructed from A. Some examples are constructing `Option<number>`
 * from `number`, `Array<number>` from `number`, etc.
 *
 * @since 2.0.0
 */
export interface Reviewer<S, A> {
  readonly review: (a: A) => S;
}

/**
 * An Optic<T, S, A> is defined as a Viewer<T, S, A> combined with a Modifier<S,
 * A>. This is the root type for the specific types of Optics defined below.
 *
 * @since 2.0.0
 */
export interface Optic<T extends Tag, S, A>
  extends Viewer<T, S, A>, Modifier<S, A> {}

/**
 * Lens<S, A> is an alias of Optic<LensTag, S, A>. This means that the view
 * function of a Lens returns a pure A value. `(s: S) => A`. Some example lenses
 * are accessing the property of a struct, accessing the first value in a Pair,
 * and the trivial identity Lens. In general, a Lens is used for focusing on
 * *exactly one* value `A` contained in the value `S`.
 *
 * @since 2.0.0
 */
export type Lens<S, A> = Optic<LensTag, S, A>;

/**
 * Iso<S, A> is an alias of Lens<S, A> & Reviewer<S, A>. This means that an Iso
 * operates exactly like a Lens with the added ability to go back from A to S.
 *
 * @since 2.0.0
 */
export type Iso<S, A> = Lens<S, A> & Reviewer<S, A>;

/**
 * AffineFold<S, A> is an alias of Optic<AffineTag, S, A>. This means the view
 * function of an AffineFold returns an Option<A>, `(s: S) => Option<A>`. Some
 * example AffineFolds are accessing a value at an index in an array, accessing
 * the value in an Option<A>, and accessing a key in a Record type. In general,
 * an AffineFold is used for focusing on *zero or one* value `A` contained in
 * the value `S`.
 *
 * @since 2.0.0
 */
export type AffineFold<S, A> = Optic<AffineTag, S, A>;

/**
 * Prism<S, A> is an alias of AffineFold<S, A> & Reviewer<S, A>. This means that
 * a Prism operates exactly like an AffineFold with the added ability to
 * *reconstruct* an S from an A. Examples of this are reconstructing an
 * Option<number> from a number, or reconstructing Either<string, number> from a
 * string or a number.
 *
 * @since 2.0.0
 */
export type Prism<S, A> = AffineFold<S, A> & Reviewer<S, A>;

/**
 * Fold<S, A> is an alias of Optic<FoldTag, S, A>. This means that the view
 * function of a Fold returns a ReadonlyArray<A>, `(s: S) => ReadonlyArray<A>`.
 * Some example Folds are accessing all of the values in a Record, Tree, Set,
 * etc. In general, a Fold is used for focusing on *any number* of values `A`
 * contained in the value `S`.
 *
 * @since 2.0.0
 */
export type Fold<S, A> = Optic<FoldTag, S, A>;

/**
 * Refold<S, A> is an alias of Fold<S, A> & Reviewer<S, A>. This means that a
 * Refold operates exactly like a Fold with the added ability to *reconstruct*
 * an S from a single value A. Examples of this are reconstructing an Array<A>
 * from a value A, or reconstructing a Tree<A> from a value A.
 *
 * @since 2.0.0
 */
export type Refold<S, A> = Fold<S, A> & Reviewer<S, A>;

/**
 * Construct a Viewer<T, S, A> from a tag T and a view function that matches
 * said tag. This is a raw constructor and is generally only useful if there is
 * a case where a structure can be lensed into but not reconstructed or
 * traversed. However, this is the core composable structure of optics, as they
 * are primarily meant as a way to retrieve data from an existing structure.
 *
 * @example The "Lens" viewer retrieves a single value that always exists.
 * ```ts
 * import type { Pair } from "./pair.ts";
 *
 * import * as O from "./optics.ts";
 * import * as P from "./pair.ts";
 *
 * const fst = <A, B = unknown>() => O.viewer<O.LensTag, Pair<A, B>, A>(
 *   O.LensTag,
 *   P.getFirst,
 * );
 *
 * const numPair = fst<number, number>();
 *
 * const result1 = numPair.view(P.pair(1, 2)); // 1
 * const result2 = numPair.view(P.pair(2, 1)); // 2
 * ```
 *
 * @example The "Affine" viewer retrieves a single value that might exists.
 * ```ts
 * import type { Either } from "./either.ts";
 *
 * import * as O from "./optics.ts";
 * import * as E from "./either.ts";
 *
 * const right = <R, L = unknown>() => O.viewer<O.AffineTag, Either<L, R>, R>(
 *   O.AffineTag,
 *   E.getRight,
 * );
 *
 * const numberEither = right<number, string>();
 *
 * const result1 = numberEither.view(E.right(1)); // Some(1)
 * const result2 = numberEither.view(E.left("Hello")); // None
 * ```
 *
 * @example The "Fold" viewer retrieves zero or more values as an Array.
 * ```ts
 * import * as O from "./optics.ts";
 *
 * const record = <A>() => O.viewer<O.FoldTag, Record<string, A>, A>(
 *   O.FoldTag,
 *   Object.values,
 * );
 *
 * const numberRecord = record<number>();
 *
 * const result = numberRecord.view({
 *   "one": 1,
 *   "two": 2,
 * }); // [1, 2]
 * ```
 *
 * @since 2.0.0
 */
export function viewer<T extends Tag, S, A>(
  tag: T,
  view: (s: S) => $<ToKind<T>, [A, never, never]>,
): Viewer<T, S, A> {
  return { tag, view };
}

/**
 * Construct a Modifier<S, A. from a modify function.
 *
 * @since 2.0.0
 */
export function modifier<S, A>(
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Modifier<S, A> {
  return { modify };
}

/**
 * Construct a Reviewer<S, A> from a review function.
 *
 * @since 2.0.0
 */
export function reviewer<S, A>(review: (a: A) => S): Reviewer<S, A> {
  return { review };
}

/**
 * Construct an Optic<U, S, A> & Reviewer<S, A> from a tag as well as view,
 * modify, and reivew functions.
 *
 * @since 2.0.0
 */
export function optic<U extends Tag, S, A>(
  tag: U,
  view: (s: S) => $<ToKind<U>, [A, never, never]>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
  review: (a: A) => S,
): Optic<U, S, A> & Reviewer<S, A>;
/**
 * Construct an Optic<U, S, A> from a tag as well as view and modify functions.
 *
 * @since 2.0.0
 */
export function optic<U extends Tag, S, A>(
  tag: U,
  view: (s: S) => $<ToKind<U>, [A, never, never]>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Optic<U, S, A>;
export function optic<U extends Tag, S, A>(
  tag: U,
  view: (s: S) => $<ToKind<U>, [A, never, never]>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
  review?: (a: A) => S,
): Optic<U, S, A> | Optic<U, S, A> & Reviewer<S, A> {
  return typeof review === "function"
    ? { tag, view, modify, review }
    : { tag, view, modify };
}

/**
 * Construct a Lens<S, A> from view and modify functions.
 *
 * @example
 * ```ts
 * import type { NonEmptyArray } from "./array.ts";
 *
 * import * as O from "./optics.ts";
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const head = <A>() => O.lens<NonEmptyArray<A>, A>(
 *   ([head]) => head,
 *   mod => ([head, ...rest]) => [mod(head), ...rest],
 * );
 *
 * const headNum = head<number>();
 *
 * const result1 = headNum.view(A.array(1, 2, 3)); // 1
 * const result2 = headNum.modify((n: number) => n + 100)(A.array(1, 2, 3));
 * // [100, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function lens<S, A>(
  view: (s: S) => A,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Lens<S, A> {
  return optic(LensTag, view, modify);
}

/**
 * Construct an Iso<S, A> from view and review functions, with an optional
 * modify function if it is different from
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { Option, match, some, none, map, fromPredicate } from "./option.ts";
 * import { pipe, identity } from "./fn.ts";
 *
 * const { view, review, modify }: O.Iso<Option<number>, number> = O.iso(
 *   match(() => 0, identity),
 *   fromPredicate(n => n !== 0),
 *   map,
 * );
 *
 * const result1 = view(some(1)); // 1
 * const result2 = view(none); // 0
 * const result3 = review(1); // Some(1)
 * const result4 = review(0); // None
 * const result5 = modify(n => n + 100)(some(1)); // Some(101)
 * const result6 = modify(n => n + 100)(none); // Some(100)
 * ```
 *
 * @since 2.0.0
 */
export function iso<S, A>(
  view: (s: S) => A,
  review: (a: A) => S,
  modify: (modifyFn: (a: A) => A) => (s: S) => S = dimap(view, review),
): Iso<S, A> {
  return optic(LensTag, view, modify, review);
}

/**
 * Construct an AffineFold<S, A> from view and modify functions.
 *
 * @example
 * ```ts
 * import type { Either } from "./either.ts";
 *
 * import * as O from "./optics.ts";
 * import * as E from "./either.ts";
 *
 * const right = <R, L = unknown>() => O.affineFold<Either<L, R>, R>(
 *   E.getRight,
 *   E.map,
 * );
 *
 * const numberRight = right<number, string>();
 *
 * const result1 = numberRight.view(E.right(1)); // Some(1)
 * const result2 = numberRight.view(E.left("Hello")); // None
 * const result3 = numberRight.modify(n => n + 1)(E.right(1)); // Right(2)
 * const result4 = numberRight.modify(n => n + 1)(E.left("Hello"));
 * // Left("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function affineFold<S, A>(
  view: (s: S) => Option<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): AffineFold<S, A> {
  return optic(AffineTag, view, modify);
}

/**
 * Construct a Prism<S, A> from view and review functions, with an optional
 * modify function that will be defaulted if not provided.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as Op from "./option.ts";
 *
 * const key = (key: string) => <A>() =>
 *   O.prism<Record<string, A>, A>(
 *     rec => Op.fromNullable(rec[key]),
 *     a => ({ [key]: a }),
 *     mod => s => Object.hasOwn(s, key) ? ({ ...s, [key]: mod(s[key]) }) : s,
 *   );
 *
 * const atFoo = key("foo")<number>();
 *
 * const result1 = atFoo.view({ bar: 1 }); // None
 * const result2 = atFoo.view({ foo: 2 }); // Some(2)
 * const result3 = atFoo.review(5); // { foo: 5 }
 * const result4 = atFoo.modify(n => n + 1)({ bar: 1 }); // { bar: 1 }
 * const result5 = atFoo.modify(n => n + 1)({ foo: 1 }); // { foo: 2 }
 * const result6 = atFoo.modify(n => n + 1)({ foo: 1, bar: 2 });
 * // { foo: 2, bar: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function prism<S, A>(
  view: (s: S) => Option<A>,
  review: (a: A) => S,
  modify: (modifyFn: (a: A) => A) => (s: S) => S = (modifyFn) => (s) =>
    pipe(view(s), O.map(modifyFn), O.match(() => s, review)),
): Prism<S, A> {
  return optic(AffineTag, view, modify, review);
}

/**
 * Construct a Fold<S, A> from view and modify functions.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as R from "./record.ts";
 *
 * const values = <A>() => O.fold<Record<string, A>, A>(
 *   Object.values,
 *   R.map,
 * );
 *
 * const numberValues = values<number>();
 *
 * const result1 = numberValues.view({}); // []
 * const result2 = numberValues.view({ foo: 1 }); // [1]
 * const result3 = numberValues.modify(n => n + 1)({}); // {}
 * const result4 = numberValues.modify(n => n + 1)({ foo: 1 }); // { foo: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function fold<S, A>(
  view: (s: S) => ReadonlyArray<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Fold<S, A> {
  return optic(FoldTag, view, modify);
}

/**
 * Construct a Refold<S, A> from view, review, and modify functions.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as S from "./set.ts";
 *
 * const set = <A>() => O.refold<ReadonlySet<A>, A>(
 *   Array.from,
 *   S.of,
 *   S.map,
 * );
 *
 * const numberSet = set<number>();
 *
 * const result1 = numberSet.view(S.set(1, 2, 3)); // [1, 2, 3]
 * const result2 = numberSet.view(S.empty()); // []
 * const result3 = numberSet.review(1); // Set(1)
 * const result4 = numberSet.modify(n => n + 1)(S.of(1)); // Set(2)
 * ```
 *
 * @since 2.0.0
 */
export function refold<S, A>(
  view: (s: S) => ReadonlyArray<A>,
  review: (a: A) => S,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Refold<S, A> {
  return { tag: FoldTag, view, review, modify };
}

/**
 * Construct a Prism<S, A> from a Refinement<S, A>.
 *
 * @example
 * ```ts
 * import type { NonEmptyArray } from "./array.ts";
 *
 * import * as O from "./optics.ts";
 *
 * const isNonEmpty = <A>(arr: ReadonlyArray<A>): arr is NonEmptyArray<A> =>
 *   arr.length > 0;
 * const nonempty = O.fromPredicate(isNonEmpty<number>);
 *
 * const result1 = nonempty.view([]); // None
 * const result2 = nonempty.view([1]); // Some([1]) as NonEmptyArray
 * const result3 = nonempty.review([1]); // [1] Cast NonEmptyArray as Array
 * ```
 *
 * @since 2.0.0
 */
export function fromPredicate<S, A extends S>(
  refinement: Refinement<S, A>,
): Prism<S, A>;
/**
 * Construct a Prism<A, A> from a Predicate<A, A>.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 *
 * const positive = O.fromPredicate((n: number) => n > 0);
 *
 * const result1 = positive.view(1); // Some(1)
 * const result2 = positive.view(0); // None
 * const result3 = positive.review(0); // 0
 * const result4 = positive.modify(n => n + 1)(0); // 0
 * const result5 = positive.modify(n => n + 1)(1); // 2
 * ```
 *
 * @since 2.0.0
 */
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A>;
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return prism(O.fromPredicate(predicate), identity);
}

/**
 * A pipeable view function that applies a value S to a Viewer<S, A>. It will
 * return either a raw value, an option, or a readonlyarray based on the tag of
 * the Viewer. Note: All Optics are Viewers.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Foo = { readonly bar: number };
 *
 * const bar = pipe(O.id<Foo>(), O.prop("bar"));
 *
 * const result = pipe(bar, O.view({ bar: 1 })); // 1
 * ```
 *
 * @since 2.0.0
 */
export function view<S>(
  s: S,
): <U extends Tag, A>(
  viewer: Viewer<U, S, A>,
) => ReturnType<typeof viewer.view> {
  return (viewer) => viewer.view(s);
}

/**
 * A pipeable modify function that applies a modification function to a
 * Modifier<S, A> modify function. It will return a function S -> S that applies
 * the modify function according to the type of optic. Note: All Optics are
 * Modifiers.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { readonly name: string };
 *
 * const name = pipe(O.id<Person>(), O.prop("name"));
 *
 * const upper = pipe(name, O.modify(s => s.toUpperCase()));
 *
 * const result1 = upper({ name: "brandon" }); // { name: "BRANDON" }
 * ```
 *
 * @since 2.0.0
 */
export function modify<A>(faa: (a: A) => A): <S>(
  modifier: Modifier<S, A>,
) => ReturnType<typeof modifier.modify> {
  return (modifier) => modifier.modify(faa);
}

/**
 * A pipeable replace function, that uses the modify function of an Optic to
 * replace an existing value over the structure S.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string };
 *
 * const name = pipe(O.id<Person>(), O.prop("name"));
 * const toBrandon = pipe(name, O.replace("Brandon"));
 *
 * const tina: Person = { name: "Tina" }
 *
 * const result = toBrandon(tina); // { name: "Brandon" }
 * ```
 *
 * @since 2.0.0
 */
export function replace<A>(a: A): <S>(
  modifier: Modifier<S, A>,
) => (s: S) => S {
  const value = () => a;
  return (modifier) => modifier.modify(value);
}

/**
 * A pipeable review function that applies a value A to the the review function
 * of a Reviewer<S, A>. It returns a value S.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numberSet = O.refold<ReadonlySet<number>, number>(
 *   Array.from,
 *   S.of,
 *   S.map,
 * );
 *
 * const result = pipe(numberSet, O.review(1)); // ReadonlySet(1)
 * ```
 *
 * @since 2.0.0
 */
export function review<A>(a: A): <S>(reviewer: Reviewer<S, A>) => S {
  return (reviewer) => reviewer.review(a);
}

/**
 * All id functions for Optics are satisfied by iso(identity, identity). Thus,
 * we construct a singleton to cut down on computation. Generally, this function
 * will be inlined.
 */
// deno-lint-ignore no-explicit-any
const _identity: Iso<any, any> = iso(identity, identity);

/**
 * Construct an Iso<A, A> from a type level argument. This is the entrypoint to
 * almost all optics as it allows one to start with a type and compose other
 * optics from there.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 *
 * const number = O.id<number>();
 *
 * const result1 = number.view(1); // 1
 * const result2 = number.review(1); // 1
 * const result4 = number.modify(n => n + 1)(1); // 2
 * ```
 *
 * @since 2.0.0
 */
export function id<A>(): Iso<A, A> {
  return _identity;
}

/**
 * Compose two optics, aligning their tag and building the composition using
 * natural transformations and monadic chaining for the view function and using
 * direct composition for the modify function.
 *
 * The general algorithm for optic composition in fun is:
 *
 * 1. Finding the alignment of them, which is Max<first, second> where
 *    Fold > AffineFold > Get
 * 2. Cast both optics to the alignment tag, one cast will always be
 *    a noop.
 * 3. Construct a new optic by chaining the view functions first to
 *    second and composing the modify functions second to first.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const even = O.fromPredicate((n: number) => n % 2 === 0);
 * const positive = O.fromPredicate((n: number) => n > 0);
 *
 * const evenPos = pipe(
 *   even,
 *   O.compose(positive),
 * );
 * const addTwo = pipe(evenPos, O.modify(n => n + 2));
 *
 * const result1 = pipe(evenPos, O.view(0)); // None
 * const result2 = pipe(evenPos, O.view(1)); // None
 * const result3 = pipe(evenPos, O.view(2)); // Some(2)
 * const result4 = addTwo(0); // 0
 * const result5 = addTwo(1); // 1
 * const result6 = addTwo(2); // 2
 * ```
 *
 * @since 2.0.0
 */
export function compose<V extends Tag, A, I>(
  second: Optic<V, A, I>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, V>, S, I> {
  return <U extends Tag, S>(
    first: Optic<U, S, A>,
  ): Optic<Align<U, V>, S, I> => {
    const tag = align(first.tag, second.tag);
    const _chain = getMonad(tag).chain;
    const _first = _unsafeCast(first, tag);
    const _second = _unsafeCast(second, tag);

    const view = flow(_first, _chain(_second));
    const modify = flow(second.modify, first.modify);

    return optic(tag, view, modify);
  };
}

/**
 * Compose two reviewer functions, allowing one to create nested Reviewer
 * structures.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = <A>() => O.refold<ReadonlySet<A>, A>(
 *   Array.from,
 *   S.of,
 *   S.map,
 * );
 *
 * const sets = pipe(
 *   set<ReadonlySet<number>>(),
 *   O.composeReviewer(set()),
 * );
 *
 * const result = sets.review(1); // Set(Set(1))
 * ```
 *
 * @since 2.0.0
 */
export function composeReviewer<A, I>(
  second: Reviewer<A, I>,
): <S>(first: Reviewer<S, A>) => Reviewer<S, I> {
  return (first) => reviewer((i) => first.review(second.review(i)));
}

/**
 * Construct a Lens Viewer from a raw value A. The view function of this viewer
 * operatates like constant(a).
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 *
 * const viewer = O.of(1);
 *
 * const result1 = viewer.view(2); // 1
 * const result2 = viewer.view(100); // 1
 * ```
 *
 * @since 2.0.0
 */
export function of<A, S = unknown>(a: A): Viewer<LensTag, S, A> {
  return viewer(LensTag, (_: S) => a);
}

/**
 * An invariant map over an Optic. If a type can be represented isomorphically
 * by another type, one can imap to go back and forth.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const plussed = pipe(
 *   O.id<number>(),
 *   O.imap(n => n + 100, n => n - 100),
 * );
 *
 * const result1 = plussed.view(1); // 101
 * const result2 = plussed.modify(n => n + 1)(1); // 2
 * ```
 *
 * @since 2.0.0
 */
export function imap<A, I>(
  fai: (a: A) => I,
  fia: (i: I) => A,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, LensTag>, S, I> {
  return compose(iso(fai, fia));
}

/**
 * Map over the Viewer portion of an optic. This effectively uses the map from
 * the Monad associated with the tag of the optic.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const mapped = pipe(
 *   O.id<ReadonlyArray<string>>(),
 *   O.index(1),
 *   O.map(str => str.length),
 * );
 *
 * const result1 = mapped.view(["Hello", "World"]); // Some(5)
 * const result2 = mapped.view([]); // None
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <T extends Tag, S>(first: Viewer<T, S, A>) => Viewer<T, S, I> {
  return ({ tag, view }) => {
    const _map = getMonad(tag).map;
    return viewer(tag, flow(view, _map(fai)));
  };
}

/**
 * Apply the value returned by a Viewer to a function returned by a Viewer.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * type State = { people: readonly Person[], format: (p: Person) => string };
 *
 * const fmt = pipe(O.id<State>(), O.prop("format"));
 * const adults = pipe(
 *   O.id<State>(),
 *   O.prop("people"),
 *   O.array,
 *   O.filter(p => p.age > 18)
 * );
 *
 * const formatted = pipe(fmt, O.ap(adults));
 *
 * const result = formatted.view({
 *   people: [
 *     { name: "Brandon", age: 37 },
 *     { name: "Rufus", age: 1 },
 *   ],
 *   format: p => `${p.name} is ${p.age}`,
 * }); // [ "Brandon is 37" ]
 * ```
 *
 * @since 2.0.0
 */
export function ap<V extends Tag, S, A>(
  second: Viewer<V, S, A> | Optic<V, S, A>,
): <U extends Tag, I>(
  first: Viewer<U, S, (a: A) => I> | Optic<U, S, (a: A) => I>,
) => Viewer<Align<U, V>, S, I> {
  return (first) => {
    const tag = align(first.tag, second.tag);
    const _ap = getMonad(tag).ap;
    const _first = _unsafeCast(first, tag);
    const _second = _unsafeCast(second, tag);
    return viewer(tag, (s) => pipe(_first(s), _ap(_second(s))));
  };
}

/**
 * A composable combinator that focuses on a property P of a struct.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { toUpperCase } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const person = O.id<Person>();
 * const name = pipe(person, O.prop("name"));
 * const age = pipe(person, O.prop("age"));
 *
 * const brandon: Person = { name: "Brandon", age: 37 };
 * const emily: Person = { name: "Emily", age: 35 };
 *
 * const result1 = pipe(name, O.view(brandon)); // "Brandon"
 * const result2 = pipe(name, O.view(emily)); // "Emily"
 * const result3 = pipe(age, O.view(brandon)); // 37
 * const result4 = pipe(brandon, name.modify(toUpperCase));
 * // { name: "BRANDON", age: 37 }
 * ```
 *
 * @since 2.0.0
 */
export function prop<A, P extends keyof A>(
  prop: P,
): <U extends Tag, S>(sa: Optic<U, S, A>) => Optic<Align<U, LensTag>, S, A[P]> {
  return compose(lens((s: A) => s[prop], (fii) => (a) => {
    const out = fii(a[prop]);
    return a[prop] === out ? a : { ...a, [prop]: out };
  }));
}

/**
 * A composible combinator that focuses on a list of properties of a struct.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Book = {
 *   title: string,
 *   description: string,
 *   authors: readonly string[],
 *   published: Date,
 * };
 *
 * const short = pipe(O.id<Book>(), O.props("title", "description"));
 *
 * const suttree: Book = {
 *   title: "Suttree",
 *   description: "Cormac on Cormac",
 *   authors: ["Cormac McCarthy"],
 *   published: new Date("May 01 1979"),
 * };
 *
 * const result1 = pipe(short, O.view(suttree));
 * // { title: "Suttree", description: "Cormac on Cormac" }
 * ```
 *
 * @since 2.0.0
 */
export function props<A extends ReadonlyRecord<unknown>, P extends keyof A>(
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
 * A composible combinator that focuses on a value in an array at the given
 * index.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const second = pipe(
 *   O.id<ReadonlyArray<string>>(),
 *   O.index(1),
 * );
 *
 * const result1 = pipe(second, O.view([])); // None
 * const result2 = pipe(second, O.view(["Hello", "World"])); // Some("World")
 * ```
 *
 * @since 2.0.0
 */
export function index(
  index: number,
): <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyArray<A>>,
) => Optic<Align<U, AffineTag>, S, A> {
  return compose(affineFold(A.lookup(index), A.modifyAt(index)));
}

/**
 * A composible combinator that focuses on a key in a readonly record.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const one = pipe(
 *   O.id<Readonly<Record<string, string>>>(),
 *   O.key("one"),
 * );
 *
 * const result1 = pipe(one, O.view({})); // None
 * const result2 = pipe(one, O.view({ one: "one" })); // Some("one")
 * ```
 *
 * @since 2.0.0
 */
export function key(
  key: string,
): <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyRecord<A>>,
) => Optic<Align<U, AffineTag>, S, A> {
  return compose(affineFold(R.lookupAt(key), R.modifyAt(key)));
}

/**
 * A composible combinator that focuses on a key in a readonly record. The
 * difference between atKey and key is that the key can be removed from the
 * record by the modify function if the modify function returns None.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { constNone } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const atOne = pipe(
 *   O.id<Readonly<Record<string, string>>>(),
 *   O.atKey("one"),
 * );
 * const removeAtOne = pipe(atOne, O.replace(constNone()));
 *
 * const result1 = pipe(atOne, O.view({})); // None
 * const result2 = pipe(atOne, O.view({ one: "one" })); // Some("one")
 * const result3 = removeAtOne({}); // {}
 * const result4 = removeAtOne({ one: "one" }); // {}
 * const result5 = removeAtOne({ one: "one", two: "two" }); // { two: "two" }
 * ```
 *
 * @since 2.0.0
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
  return compose(lens(
    lookup,
    (faa) => over(flow(lookup, faa, O.match(deleteAt, insertAt))),
  ));
}

/**
 * A composible combinator that can filter or refine the focused value of an
 * existing optic. Care should be taken with this operator as it apples to the
 * modify function as well as the view function. That is to say that if the
 * refinement or predicate returns false for the focused value then that value
 * will not be modified. See the example for clarification.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const positive = pipe(O.id<number>(), O.filter(n => n > 0));
 *
 * const result1 = pipe(positive, O.view(1)); // Some(1);
 * const result2 = pipe(positive, O.view(0)); // None
 * const result3 = pipe(1, positive.modify(n => n + 1)); // 2
 * const result4 = pipe(0, positive.modify(n => n + 1)); // 0
 * ```
 *
 * @since 2.0.0
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
  return compose(fromPredicate(predicate));
}

/**
 * Construct a composable combinator from an instance of Eq and a key of a map.
 * The combinator can then be composed with an existing optic to access or
 * remove the value in the map.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as M from "./map.ts";
 * import { EqString, toLowerCase } from "./string.ts";
 * import { contramap } from "./eq.ts";
 * import { constNone } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Words = ReadonlyMap<string, number>;
 *
 * const insensitive = pipe(EqString, contramap(toLowerCase));
 *
 * const fun = pipe(O.id<Words>(), O.atMap(insensitive)("fun"));
 * const remove = pipe(fun, O.replace(constNone()));
 *
 * const result1 = pipe(fun, O.view(new Map([["FUN", 100]]))); // Some(100)
 * const result2 = pipe(fun, O.view(M.empty())); // None
 * const result3 = remove(new Map([["FUN", 100], ["not", 10]]));
 * // Map("not": 10);
 * ```
 *
 * @since 2.0.0
 */
export function atMap<B>(eq: Eq<B>): (key: B) => <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyMap<B, A>>,
) => Optic<Align<U, LensTag>, S, Option<A>> {
  return (key) => {
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
 * Construct a composable optic from a Traversable instance for a Kind T. This
 * will reduce the values wrapped in the Kind T into a single Array when viewed.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as T from "./tree.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Data = { tree: T.Tree<number> };
 *
 * const numbers = pipe(
 *   O.id<Data>(),
 *   O.prop("tree"),
 *   O.traverse(T.TraversableTree),
 * );
 *
 * const tree1: Data = { tree: T.tree(1, [T.tree(2), T.tree(3)]) };
 * const tree2: Data = { tree: T.tree(0) };
 *
 * const result1 = pipe(numbers, O.view(tree1)); // [1, 2, 3]
 * const result2 = pipe(numbers, O.view(tree2)); // [0]
 * const result3 = pipe(tree1, numbers.modify(n => n + 1));
 * // Tree(2, [Tree(3), Tree(4)])
 * ```
 *
 * @since 2.0.0
 */
export function traverse<T extends Kind>(
  T: Traversable<T>,
): <U extends Tag, S, A, B, C, D, E>(
  first: Optic<U, S, $<T, [A, B, C], [D], [E]>>,
) => Optic<Align<U, FoldTag>, S, A> {
  return compose(fold(
    T.reduce((as, a) => as.concat(a), A.empty()),
    T.map,
  ));
}

/**
 * Given a Monoid<I> and a function A -> I, collect all values A focused on by an
 * optic into a single value I.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { MonoidNumberSum } from "./number.ts";
 * import { pipe, identity } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * type People = readonly Person[];
 *
 * const cumulativeAge = pipe(
 *   O.id<People>(),
 *   O.array,
 *   O.prop("age"),
 *   O.concatAll(MonoidNumberSum, identity),
 * );
 *
 * const people: People = [
 *   { name: "Brandon", age: 37 },
 *   { name: "Emily", age: 22 },
 *   { name: "Jackie", age: 47 },
 *   { name: "Rufus", age: 1 },
 * ];
 *
 * const result1 = cumulativeAge(people); // 107
 * const result2 = cumulativeAge([]); // 0
 * ```
 *
 * @since 2.0.0
 */
export function concatAll<A, I>(M: Monoid<I>, fai: (a: A) => I) {
  const _concatAll = getConcatAll(M);
  return <U extends Tag, S>(first: Optic<U, S, A>): (s: S) => I => {
    const view = _unsafeCast(first, FoldTag);
    return flow(view, A.map(fai), _concatAll);
  };
}

/**
 * A preconstructed traversal that focuses the values of a ReadonlyRecord.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   O.id<Readonly<Record<string, number>>>(),
 *   O.record,
 *   O.view({ one: 1, two: 2 }),
 * ); // [1, 2]
 * ```
 *
 * @since 2.0.0
 */
export const record: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyRecord<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(R.TraversableRecord);

/**
 * A preconstructed traversal that focuses the values of a ReadonlyArray.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   O.id<ReadonlyArray<number>>(),
 *   O.array,
 *   O.filter(n => n % 2 === 0),
 *   O.view([1, 2, 3]),
 * ); // [2]
 * ```
 *
 * @since 2.0.0
 */
export const array: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyArray<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(A.TraversableArray);

/**
 * A preconstructed traversal that focuses the values of a ReadonlySet.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   O.id<ReadonlySet<number>>(),
 *   O.set,
 *   O.view(new Set([1, 2, 3])),
 * ); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export const set: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlySet<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(TraversableSet);

/**
 * A preconstructed traversal that focuses the values of a Tree.
 *
 * @example
 * ```ts
 * import type { Tree } from "./tree.ts";
 * import * as O from "./optics.ts";
 * import * as T from "./tree.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   O.id<Tree<number>>(),
 *   O.tree,
 *   O.view(T.tree(1, [T.tree(2, [T.tree(3)])])),
 * ); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export const tree: <U extends Tag, S, A>(
  first: Optic<U, S, Tree<A>>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(TraversableTree);

/**
 * A preconstructed filter that focuses on the the non-null and non-undefined
 * value of A | null | undefined.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { constNone } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Input = { value?: string | null };
 *
 * const value = pipe(O.id<Input>(), O.prop("value"), O.nilable);
 *
 * const result1 = pipe(value, O.view({})); // None
 * const result2 = pipe(value, O.view({ value: "Hello" })); // Some("Hello")
 * ```
 *
 * @since 2.0.0
 */
export const nilable: <U extends Tag, S, A>(
  first: Optic<U, S, A>,
) => Optic<Align<U, AffineTag>, S, NonNullable<A>> = filter(isNotNil);

/**
 * A preconstructed composed prism that focuses on the Some value of an Option.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { Option, some, none } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, talent: Option<string> };
 * type People = readonly Person[]
 *
 * const talent = pipe(O.id<People>(), O.array, O.prop("talent"), O.some);
 *
 * const brandon: Person = { name: "Brandon", talent: none };
 * const emily: Person = { name: "Emily", talent: some("Knitting") };
 *
 * const result = pipe(talent, O.view([brandon, emily])); // ["Knitting"];
 * ```
 *
 * @since 2.0.0
 */
export const some: <U extends Tag, S, A>(
  optic: Optic<U, S, Option<A>>,
) => Optic<Align<U, AffineTag>, S, A> = compose(prism(identity, O.of, O.map));

/**
 * A preconstructed composed prism that focuses on the Right value of an Either.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Response = E.Either<Error, string>;
 *
 * const value = pipe(O.id<Response>(), O.right);
 *
 * const result1 = pipe(value, O.view(E.right("Good job!")));
 * // Some("Good job!")
 * const result2 = pipe(value, O.view(E.left(new Error("Something broke"))));
 * // None
 * ```
 *
 * @since 2.0.0
 */
export const right: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Align<U, AffineTag>, S, A> = compose(
  prism(E.getRight, E.right, E.map),
);

/**
 * A preconstructed composed prism that focuses on the Left value of an Either.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Response = E.Either<Error, string>;
 *
 * const value = pipe(O.id<Response>(), O.left);
 *
 * const result1 = pipe(value, O.view(E.right("Good job!")));
 * // None
 * const result2 = pipe(value, O.view(E.left(new Error("Something broke"))));
 * // Some(Error("Something broke"))
 * ```
 *
 * @since 2.0.0
 */
export const left: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Align<U, AffineTag>, S, B> = compose(
  prism(E.getLeft, E.left, E.mapLeft),
);

/**
 * A preconstructed composed lens that focuses on the First value of a Pair.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Pair<numerator, denominator>
 * type Rational = P.Pair<number, number>;
 *
 * const numerator = pipe(O.id<Rational>(), O.first);
 *
 * const result = pipe(numerator, O.view(P.pair(1, 1))); // 1
 * ```
 *
 * @since 2.0.0
 */
export const first: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Align<U, LensTag>, S, A> = compose(lens(P.getFirst, P.map));

/**
 * A preconstructed composed lens that focuses on the Second value of a Pair.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Pair<numerator, denominator>
 * type Rational = P.Pair<number, number>
 *
 * const denominator = pipe(O.id<Rational>(), O.first);
 *
 * const result = pipe(denominator, O.view(P.pair(1, 2))); // 2
 * ```
 *
 * @since 2.0.0
 */
export const second: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Align<U, LensTag>, S, B> = compose(lens(P.getSecond, P.mapLeft));
