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
 * @module Optic
 * @since 2.0.0
 */

import type { $, Kind } from "./kind.ts";
import type { Comparable } from "./comparable.ts";
import type { DatumEither } from "./datum_either.ts";
import type { Initializable } from "./initializable.ts";
import type { Either } from "./either.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Refinement } from "./refinement.ts";
import type { Traversable } from "./traversable.ts";
import type { Tree } from "./tree.ts";

import * as A from "./array.ts";
import * as DE from "./datum_either.ts";
import * as E from "./either.ts";
import * as I from "./identity.ts";
import * as M from "./map.ts";
import * as O from "./option.ts";
import * as P from "./pair.ts";
import * as R from "./record.ts";
import { TraversableSet } from "./set.ts";
import { TraversableTree } from "./tree.ts";
import { isNotNil } from "./nil.ts";
import { getCombineAll } from "./initializable.ts";
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

export const YesRev = "YesRev" as const;
export type YesRev = typeof YesRev;

export const NoRev = "NoRev" as const;
export type NoRev = typeof NoRev;

export type Rev = YesRev | NoRev;

export type AlignRev<A extends Rev, B extends Rev> = A extends YesRev
  ? B extends YesRev ? YesRev : NoRev
  : NoRev;

/**
 * A type level mapping from an Optic Tag to its associated output Kind. This is
 * used to substitute the container of the output of a view function.
 */
type ToKind<T extends Tag> = T extends LensTag ? I.KindIdentity
  : T extends AffineTag ? O.KindOption
  : T extends FoldTag ? A.KindReadonlyArray
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
export function _unsafeCast<U extends Tag, V extends Tag, S, A, R extends Rev>(
  optic: Optic<U, S, A, R>,
  tag: V,
): Optic<V, S, A, R>["view"] {
  type Out = Optic<V, S, A, R>["view"];
  // Covers Lens => Lens, AffineFold => AffineFold, Fold => Fold
  if (optic.tag === tag as LensTag) {
    return optic.view as Out;
    // AffineFold => Fold
  } else if (tag === FoldTag && optic.tag === AffineTag) {
    return (s: S) => {
      const ua = optic.view(s) as Option<A>;
      return (O.isNone(ua) ? [] : [ua.value]) as ReturnType<Out>;
    };
    // Lens => Fold
  } else if (tag === FoldTag && optic.tag === LensTag) {
    return (s: S) => [optic.view(s)] as ReturnType<Out>;
    // Lens => AffineFold
  } else if (tag === AffineTag && optic.tag == LensTag) {
    return (s) => O.wrap(optic.view(s)) as ReturnType<Out>;
  }
  // Non-valid casts will throw an error at runtime.
  // This is not reachable with the combinators in this lib.
  throw new Error(`Attempted to cast ${optic.tag} to ${tag}`);
}

/**
 * Recover a Flatmappable from an Optic Tag. The following cases are handled:
 *
 * * LensTag => FlatmappableIdentity
 * * AffineTag => FlatmappableOption
 * * FoldTag => FlatmappableArray
 */
function getFlatmappable<T extends Tag>(tag: T): Flatmappable<ToKind<T>> {
  type Result = Flatmappable<ToKind<T>>;
  switch (tag) {
    case FoldTag:
      return A.FlatmappableArray as unknown as Result;
    case AffineTag:
      return O.FlatmappableOption as unknown as Result;
    case LensTag:
      return I.FlatmappableIdentity as unknown as Result;
    default:
      throw new Error(`Unable to get Flatmappable for ${tag}`);
  }
}

/**
 * An Optic<T, S, A> is defined as a Viewer<T, S, A> combined with a Modifier<S,
 * A>. This is the root type for the specific types of Optics defined below.
 *
 * @since 2.0.0
 */
export interface Optic<T extends Tag, S, A, R extends Rev = NoRev> {
  readonly tag: T;
  readonly view: (s: S) => $<ToKind<T>, [A, never, never]>;
  readonly modify: (modifyFn: (a: A) => A) => (s: S) => S;
  readonly review: R extends YesRev ? (a: A) => S : never;
}

export type TagOf<U> = U extends Optic<infer T, infer _, infer __, infer ___>
  ? T
  : never;

export type ViewOf<U> = U extends Optic<infer _, infer S, infer __, infer ___>
  ? S
  : never;

export type TypeOf<U> = U extends Optic<infer _, infer __, infer A, infer ___>
  ? A
  : never;

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
export type Iso<S, A> = Optic<LensTag, S, A, YesRev>;

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
export type Prism<S, A> = Optic<AffineTag, S, A, YesRev>;

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
export type Refold<S, A> = Optic<FoldTag, S, A, YesRev>;

/**
 * Construct an Optic<U, S, A> & Reviewer<S, A> from a tag as well as view,
 * modify, and reivew functions.
 *
 * @since 2.0.0
 */
export function optic<U extends Tag, S, A, R extends Rev = NoRev>(
  tag: U,
  view: (s: S) => $<ToKind<U>, [A, never, never]>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
  review?: (a: A) => S,
): Optic<U, S, A, R> {
  return (typeof review === "function"
    ? { tag, view, modify, review }
    : { tag, view, modify }) as Optic<U, S, A, R>;
}

/**
 * Construct a Lens<S, A> from view and modify functions.
 *
 * @example
 * ```ts
 * import type { NonEmptyArray } from "./array.ts";
 *
 * import * as O from "./optic.ts";
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
 * import * as O from "./optic.ts";
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
 * import * as O from "./optic.ts";
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
 * import * as O from "./optic.ts";
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
 * import * as O from "./optic.ts";
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
 * import * as O from "./optic.ts";
 * import * as S from "./set.ts";
 *
 * const set = <A>() => O.refold<ReadonlySet<A>, A>(
 *   Array.from,
 *   S.wrap,
 *   S.map,
 * );
 *
 * const numberSet = set<number>();
 *
 * const result1 = numberSet.view(S.set(1, 2, 3)); // [1, 2, 3]
 * const result2 = numberSet.view(S.init()); // []
 * const result3 = numberSet.review(1); // Set(1)
 * const result4 = numberSet.modify(n => n + 1)(S.wrap(1)); // Set(2)
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
 * import * as O from "./optic.ts";
 *
 * const isNonEmpty = <A>(arr: ReadonlyArray<A>): arr is NonEmptyArray<A> =>
 *   arr.length > 0;
 * const noninit = O.fromPredicate(isNonEmpty<number>);
 *
 * const result1 = noninit.view([]); // None
 * const result2 = noninit.view([1]); // Some([1]) as NonEmptyArray
 * const result3 = noninit.review([1]); // [1] Cast NonEmptyArray as Array
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
 * import * as O from "./optic.ts";
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
 * import * as O from "./optic.ts";
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

function hasReview<T extends Tag, S, A>(
  optic: Optic<T, S, A, Rev>,
): optic is Optic<T, S, A, YesRev> {
  return Object.hasOwn(optic, "review") && typeof optic.review === "function";
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
 * import * as O from "./optic.ts";
 * import { pipe } from "./fn.ts";
 *
 * const even = O.fromPredicate((n: number) => n % 2 === 0);
 * const positive = O.fromPredicate((n: number) => n > 0);
 *
 * const evenPos = pipe(
 *   even,
 *   O.compose(positive),
 * );
 * const addTwo = evenPos.modify(n => n + 2);
 *
 * const result1 = evenPos.view(0); // None
 * const result2 = evenPos.view(1); // None
 * const result3 = evenPos.view(2); // Some(2)
 * const result4 = addTwo(0); // 0
 * const result5 = addTwo(1); // 1
 * const result6 = addTwo(2); // 2
 * ```
 *
 * @since 2.0.0
 */
export function compose<V extends Tag, A, I, R2 extends Rev>(
  second: Optic<V, A, I, R2>,
): <U extends Tag, S, R1 extends Rev>(
  first: Optic<U, S, A, R1>,
) => Optic<Align<U, V>, S, I, AlignRev<R1, R2>> {
  return <U extends Tag, S, R1 extends Rev>(
    first: Optic<U, S, A, R1>,
  ): Optic<Align<U, V>, S, I, AlignRev<R1, R2>> => {
    const tag = align(first.tag, second.tag);
    const _chain = getFlatmappable(tag).flatmap;
    const _first = _unsafeCast(first, tag);
    const _second = _unsafeCast(second, tag);

    const view = flow(_first, _chain(_second));
    const modify = flow(second.modify, first.modify);

    if (hasReview(first) && hasReview(second)) {
      const review = flow(second.review, first.review);
      return optic(tag, view, modify, review);
    }

    return optic(tag, view, modify);
  };
}

/**
 * Construct a Lens Viewer from a raw value A. The view function of this viewer
 * operatates like constant(a).
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 *
 * const viewer = O.wrap(1);
 *
 * const result1 = viewer.view(2); // 1
 * const result2 = viewer.view(100); // 1
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): Iso<A, A> {
  return iso(() => a, identity, (faa) => faa);
}

/**
 * An invariant map over an Optic. If a type can be represented isomorphically
 * by another type, one can imap to go back and forth.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
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
): <U extends Tag, S, R extends Rev>(
  first: Optic<U, S, A, R>,
) => Optic<Align<U, LensTag>, S, I, AlignRev<R, YesRev>> {
  return compose(iso(fai, fia));
}

/**
 * A composable combinator that focuses on a property P of a struct.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
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
 * const result1 = name.view(brandon); // "Brandon"
 * const result2 = name.view(emily); // "Emily"
 * const result3 = age.view(brandon); // 37
 * const result4 = pipe(brandon, name.modify(toUpperCase));
 * // { name: "BRANDON", age: 37 }
 * ```
 *
 * @since 2.0.0
 */
export function prop<A, P extends keyof A>(
  prop: P,
): <U extends Tag, S, R extends Rev>(
  sa: Optic<U, S, A, R>,
) => Optic<Align<U, LensTag>, S, A[P]> {
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
 * import * as O from "./optic.ts";
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
 * const result1 = short.view(suttree);
 * // { title: "Suttree", description: "Cormac on Cormac" }
 * ```
 *
 * @since 2.0.0
 */
export function props<A extends Record<string, unknown>, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <U extends Tag, S, R extends Rev>(
  first: Optic<U, S, A, R>,
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
 * import * as O from "./optic.ts";
 * import { pipe } from "./fn.ts";
 *
 * const second = pipe(
 *   O.id<ReadonlyArray<string>>(),
 *   O.index(1),
 * );
 *
 * const result1 = second.view([]); // None
 * const result2 = second.view(["Hello", "World"]); // Some("World")
 * ```
 *
 * @since 2.0.0
 */
export function index(
  index: number,
): <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, ReadonlyArray<A>, R>,
) => Optic<Align<U, AffineTag>, S, A> {
  return compose(affineFold(A.lookup(index), A.modifyAt(index)));
}

/**
 * A composible combinator that focuses on a key in a readonly record.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import { pipe } from "./fn.ts";
 *
 * const one = pipe(
 *   O.id<Readonly<Record<string, string>>>(),
 *   O.key("one"),
 * );
 *
 * const result1 = one.view({}); // None
 * const result2 = one.view({ one: "one" }); // Some("one")
 * ```
 *
 * @since 2.0.0
 */
export function key(
  key: string,
): <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, Record<string, A>, R>,
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
 * import * as O from "./optic.ts";
 * import { constNone } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const atOne = pipe(
 *   O.id<Readonly<Record<string, string>>>(),
 *   O.atKey("one"),
 * );
 * const removeAtOne = atOne.modify(constNone);
 *
 * const result1 = atOne.view({}); // None
 * const result2 = atOne.view({ one: "one" }); // Some("one")
 * const result3 = removeAtOne({}); // {}
 * const result4 = removeAtOne({ one: "one" }); // {}
 * const result5 = removeAtOne({ one: "one", two: "two" }); // { two: "two" }
 * ```
 *
 * @since 2.0.0
 */
export function atKey(
  key: string,
): <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, Readonly<Record<string, A>>, R>,
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
 * import * as O from "./optic.ts";
 * import { pipe } from "./fn.ts";
 *
 * const positive = pipe(O.id<number>(), O.filter(n => n > 0));
 *
 * const result1 = positive.view(1); // Some(1);
 * const result2 = positive.view(0); // None
 * const result3 = pipe(1, positive.modify(n => n + 1)); // 2
 * const result4 = pipe(0, positive.modify(n => n + 1)); // 0
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  r: Refinement<A, B>,
): <U extends Tag, S, R extends Rev>(
  first: Optic<U, S, A, R>,
) => Optic<Align<U, AffineTag>, S, B, AlignRev<R, YesRev>>;
export function filter<A>(
  r: Predicate<A>,
): <U extends Tag, S, R extends Rev>(
  first: Optic<U, S, A, R>,
) => Optic<Align<U, AffineTag>, S, A, AlignRev<R, YesRev>>;
export function filter<A>(
  predicate: Predicate<A>,
): <U extends Tag, S, R extends Rev>(
  first: Optic<U, S, A, R>,
) => Optic<Align<U, AffineTag>, S, A, AlignRev<R, YesRev>> {
  return compose(fromPredicate(predicate));
}

/**
 * Construct a composable combinator from an instance of Comparable and a key of a map.
 * The combinator can then be composed with an existing optic to access or
 * remove the value in the map.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import * as M from "./map.ts";
 * import { ComparableString, toLowerCase } from "./string.ts";
 * import { premap } from "./comparable.ts";
 * import { constNone } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Words = ReadonlyMap<string, number>;
 *
 * const insensitive = pipe(ComparableString, premap(toLowerCase));
 *
 * const fun = pipe(O.id<Words>(), O.atMap(insensitive)("fun"));
 * const remove = fun.modify(constNone);
 *
 * const result1 = fun.view(M.readonlyMap(["FUN", 100])); // Some(100)
 * const result2 = fun.view(M.init()); // None
 * const result3 = remove(M.readonlyMap(["FUN", 100], ["not", 10]));
 * // Map("not": 10);
 * ```
 *
 * @since 2.0.0
 */
export function atMap<B>(
  eq: Comparable<B>,
): (key: B) => <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, ReadonlyMap<B, A>, R>,
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
 * will fold the values wrapped in the Kind T into a single Array when viewed.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
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
 * const result1 = numbers.view(tree1); // [1, 2, 3]
 * const result2 = numbers.view(tree2); // [0]
 * const result3 = pipe(tree1, numbers.modify(n => n + 1));
 * // Tree(2, [Tree(3), Tree(4)])
 * ```
 *
 * @since 2.0.0
 */
export function traverse<T extends Kind>(
  T: Traversable<T>,
): <U extends Tag, S, A, B, C, D, E, R extends Rev>(
  first: Optic<U, S, $<T, [A, B, C], [D], [E]>, R>,
) => Optic<Align<U, FoldTag>, S, A> {
  return compose(fold(
    T.fold((as, a) => [...as, a], (<A>(): A[] => [])()),
    T.map,
  ));
}

/**
 * Given a Combinable<I> and a function A -> I, collect all values A focused on by an
 * optic into a single value I.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import { InitializableNumberSum } from "./number.ts";
 * import { pipe, identity } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * type People = readonly Person[];
 *
 * const cumulativeAge = pipe(
 *   O.id<People>(),
 *   O.array,
 *   O.prop("age"),
 *   O.combineAll(InitializableNumberSum, identity),
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
export function combineAll<A, I>(
  initializable: Initializable<I>,
  fai: (a: A) => I,
): <U extends Tag, S, R extends Rev>(first: Optic<U, S, A, R>) => (s: S) => I {
  const _combineAll = getCombineAll(initializable);
  return <U extends Tag, S, R extends Rev>(
    first: Optic<U, S, A, R>,
  ): (s: S) => I => {
    const view = _unsafeCast(first, FoldTag);
    return flow(view, A.map(fai), (is) => _combineAll(...is));
  };
}

/**
 * A preconstructed traversal that focuses the values of a ReadonlyRecord.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import { pipe } from "./fn.ts";
 *
 * const nums = pipe(
 *   O.id<Readonly<Record<string, number>>>(),
 *   O.record,
 * );
 *
 * const result = nums.view({ one: 1, two: 2 }); // [1, 2]
 * ```
 *
 * @since 2.0.0
 */
export const record: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyRecord<A>, Rev>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(R.TraversableRecord);

/**
 * A preconstructed traversal that focuses the values of a ReadonlyArray.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import { pipe } from "./fn.ts";
 *
 * const filtered = pipe(
 *   O.id<ReadonlyArray<number>>(),
 *   O.array,
 *   O.filter(n => n % 2 === 0),
 * );
 * const result = filtered.view([1, 2, 3]); // [2]
 * ```
 *
 * @since 2.0.0
 */
export const array: <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, ReadonlyArray<A>, R>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(A.TraversableArray);

/**
 * A preconstructed traversal that focuses the values of a ReadonlySet.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import { pipe } from "./fn.ts";
 *
 * const nums = pipe(
 *   O.id<ReadonlySet<number>>(),
 *   O.set,
 * );
 *
 * const result = nums.view(new Set([1, 2, 3])); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export const set: <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, ReadonlySet<A>, R>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(TraversableSet);

/**
 * A preconstructed traversal that focuses the values of a Tree.
 *
 * @example
 * ```ts
 * import type { Tree } from "./tree.ts";
 * import * as O from "./optic.ts";
 * import * as T from "./tree.ts";
 * import { pipe } from "./fn.ts";
 *
 * const nums = pipe(
 *   O.id<Tree<number>>(),
 *   O.tree,
 * );
 *
 * const result = nums.view(T.tree(1, [T.tree(2, [T.tree(3)])])); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export const tree: <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, Tree<A>, R>,
) => Optic<Align<U, FoldTag>, S, A> = traverse(TraversableTree);

/**
 * A preconstructed filter that focuses on the the non-null and non-undefined
 * value of A | null | undefined.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import { constNone } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Input = { value?: string | null };
 *
 * const value = pipe(O.id<Input>(), O.prop("value"), O.nil);
 *
 * const result1 = value.view({}); // None
 * const result2 = value.view({ value: "Hello" }); // Some("Hello")
 * ```
 *
 * @since 2.0.0
 */
export const nil: <U extends Tag, S, A, R extends Rev>(
  first: Optic<U, S, A, R>,
) => Optic<Align<U, AffineTag>, S, NonNullable<A>, AlignRev<R, YesRev>> =
  filter(isNotNil);

/**
 * A preconstructed composed prism that focuses on the Some value of an Option.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
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
 * const result = talent.view([brandon, emily]); // ["Knitting"];
 * ```
 *
 * @since 2.0.0
 */
export const some: <U extends Tag, S, A, R extends Rev>(
  optic: Optic<U, S, Option<A>, R>,
) => Optic<Align<U, AffineTag>, S, A, AlignRev<R, YesRev>> = compose(
  prism(identity, O.wrap, O.map),
);

/**
 * A preconstructed composed prism that focuses on the Right value of an Either.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Response = E.Either<Error, string>;
 *
 * const value = pipe(O.id<Response>(), O.right);
 *
 * const result1 = value.view(E.right("Good job!"));
 * // Some("Good job!")
 * const result2 = value.view(E.left(new Error("Something broke")));
 * // None
 * ```
 *
 * @since 2.0.0
 */
export const right: <U extends Tag, S, B, A, R extends Rev>(
  optic: Optic<U, S, Either<B, A>, R>,
) => Optic<Align<U, AffineTag>, S, A, AlignRev<R, YesRev>> = compose(
  prism(E.getRight, E.right, E.map),
);

/**
 * A preconstructed composed prism that focuses on the Left value of an Either.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Response = E.Either<Error, string>;
 *
 * const value = pipe(O.id<Response>(), O.left);
 *
 * const result1 = value.view(E.right("Good job!"));
 * // None
 * const result2 = value.view(E.left(new Error("Something broke")));
 * // Some(Error("Something broke"))
 * ```
 *
 * @since 2.0.0
 */
export const left: <U extends Tag, S, B, A, R extends Rev>(
  optic: Optic<U, S, Either<B, A>, R>,
) => Optic<Align<U, AffineTag>, S, B, AlignRev<R, YesRev>> = compose(
  prism(E.getLeft, E.left, E.mapSecond),
);

/**
 * A preconstructed composed lens that focuses on the First value of a Pair.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Pair<numerator, denominator>
 * type Rational = P.Pair<number, number>;
 *
 * const numerator = pipe(O.id<Rational>(), O.first);
 *
 * const result = numerator.view(P.pair(1, 1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export const first: <U extends Tag, S, B, A, R extends Rev>(
  optic: Optic<U, S, Pair<A, B>, R>,
) => Optic<Align<U, LensTag>, S, A> = compose(lens(P.getFirst, P.map));

/**
 * A preconstructed composed lens that focuses on the Second value of a Pair.
 *
 * @example
 * ```ts
 * import * as O from "./optic.ts";
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Pair<numerator, denominator>
 * type Rational = P.Pair<number, number>
 *
 * const denominator = pipe(O.id<Rational>(), O.first);
 *
 * const result = denominator.view(P.pair(1, 2)); // 2
 * ```
 *
 * @since 2.0.0
 */
export const second: <U extends Tag, S, B, A, R extends Rev>(
  optic: Optic<U, S, Pair<A, B>, R>,
) => Optic<Align<U, LensTag>, S, B> = compose(lens(P.getSecond, P.mapSecond));

/**
 * @since 2.1.0
 */
export const success: <U extends Tag, S, B, A, R extends Rev>(
  optic: Optic<U, S, DatumEither<B, A>, R>,
) => Optic<Align<U, AffineTag>, S, A, AlignRev<R, YesRev>> = compose(
  prism(DE.getSuccess, DE.success, DE.map),
);

/**
 * @since 2.1.0
 */
export const failure: <U extends Tag, S, B, A, R extends Rev>(
  optic: Optic<U, S, DatumEither<B, A>, R>,
) => Optic<Align<U, AffineTag>, S, B, AlignRev<R, YesRev>> = compose(
  prism(DE.getFailure, DE.failure, DE.mapSecond),
);
