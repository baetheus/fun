/**
 * The Decoder module contains tools for the course parsing of javascript
 * objects into well typed structures. In the event that parsing fails a Decoder
 * returns a DecodeError data structure which contains detailed information on
 * how and where parsing failed.
 *
 * @todo Revisit array, tuple, record, and struct to have a concept of ...rest
 *
 * @module Decoder
 *
 * @since 2.0.0
 */

import type { In, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { AnyArray, NonEmptyArray } from "./array.ts";
import type { Applicative } from "./applicative.ts";
import type { Apply } from "./apply.ts";
import type { Chain } from "./chain.ts";
import type { Either } from "./either.ts";
import type { FnEither } from "./fn_either.ts";
import type { Forest } from "./tree.ts";
import type { Functor } from "./functor.ts";
import type { Literal, Schemable } from "./schemable.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Predicate } from "./predicate.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Refinement } from "./refinement.ts";
import type { Semigroup } from "./semigroup.ts";

import * as FE from "./fn_either.ts";
import * as TR from "./tree.ts";
import * as E from "./either.ts";
import * as A from "./array.ts";
import * as R from "./record.ts";
import * as O from "./option.ts";
import * as S from "./schemable.ts";
import * as G from "./refinement.ts";
import { flow, memoize, pipe } from "./fn.ts";

/**
 * The required tag denotes that a property in a struct or tuple is required.
 * This means that the key or index must exist on the struct or tuple.
 *
 * @since 2.0.0
 */
export const required = "required" as const;

/**
 * The optional tag denotes that a property in a struct or tuple is optional.
 * This means that the key or index may not exist on the struct or tuple.
 *
 * @since 2.0.0
 */
export const optional = "optional" as const;

/**
 * The Property type is a type level denotation that specifies whether a key or
 * index is required or optional.
 *
 * @since 2.0.0
 */
export type Property = typeof required | typeof optional;

/**
 * The Leaf type is the simplest of DecodeErrors. It indicates that some
 * concrete value did not match the expected value. The reason field is used to
 * indicate the expected value.
 *
 * @since 2.0.0
 */
export type Leaf = {
  readonly tag: "Leaf";
  readonly value: unknown;
  readonly reason: string;
};

/**
 * The Wrap type is used to give context to an existing DecodeError. This can be
 * as simple as wrapping an array decode error to indicate that we first check
 * for an array before we check that the array matches a tuple definition. It
 * can also be used to constrain or annotate.
 *
 * @since 2.0.0
 */
export type Wrap = {
  readonly tag: "Wrap";
  readonly context: string;
  readonly error: DecodeError;
};

/**
 * The Key type is used to contextualize an error that occurred at a key in a
 * struct.
 *
 * @since 2.0.0
 */
export type Key = {
  readonly tag: "Key";
  readonly key: string;
  readonly property: Property;
  readonly error: DecodeError;
};

/**
 * The Index type is used to contextualize an error that occurred at an index in
 * an Array or Tuple.
 *
 * @since 2.0.0
 */
export type Index = {
  readonly tag: "Index";
  readonly index: number;
  readonly property: Property;
  readonly error: DecodeError;
};

/**
 * The Union type is used to associate two or more DecoderErrors as a union of
 * errors.
 *
 * @since 2.0.0
 */
export type Union = {
  readonly tag: "Union";
  readonly errors: readonly [DecodeError, DecodeError, ...DecodeError[]];
};

/**
 * The Intersection type is used to associate two or more DecodeErrors as an
 * intersection of errors.
 *
 * @since 2.0.0
 */
export type Intersection = {
  readonly tag: "Intersection";
  readonly errors: readonly [DecodeError, DecodeError, ...DecodeError[]];
};

/**
 * The Many type is used to represent zero or more DecodeErrors without
 * context. It's purpose is to be used as both Empty and a target for
 * concatenation of DecodeErrors that are neither Union or Intersection types.
 * This allows us to build a Monoid over DecodeError.
 *
 * @since 2.0.0
 */
export type Many = {
  readonly tag: "Many";
  readonly errors: readonly DecodeError[];
};

/**
 * The DecodeError type is a discriminated union of potential contextualized
 * errors that are encountered while decoding.
 *
 * @since 2.0.0
 */
export type DecodeError =
  | Leaf
  | Wrap
  | Key
  | Index
  | Union
  | Intersection
  | Many;

/**
 * A refinement that returns true when a DecodeError is a Leaf.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.isLeaf(D.leafErr(1, "expected string")); // true
 * const result2 = D.isLeaf(D.manyErr()); // false
 * ```
 *
 * @since 2.0.0
 */
export function isLeaf(err: DecodeError): err is Leaf {
  return err.tag === "Leaf";
}

/**
 * A refinement that returns true when a DecodeError is a Wrap.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.isWrap(D.wrapErr(
 *   "This is some context",
 *   D.leafErr(1, "expected string")
 * )); // true
 * const result2 = D.isWrap(D.manyErr()); // false
 * ```
 *
 * @since 2.0.0
 */
export function isWrap(err: DecodeError): err is Wrap {
  return err.tag === "Wrap";
}

/**
 * A refinement that returns true when a DecodeError is a Key.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.isKey(D.keyErr(
 *   "one",
 *   D.leafErr(1, "expected string")
 * )); // true
 * const result2 = D.isKey(D.manyErr()); // false
 * ```
 *
 * @since 2.0.0
 */
export function isKey(err: DecodeError): err is Key {
  return err.tag === "Key";
}

/**
 * A refinement that returns true when a DecodeError is an Index.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.isIndex(D.indexErr(
 *   1,
 *   D.leafErr(1, "expected string")
 * )); // true
 * const result2 = D.isIndex(D.manyErr()); // false
 * ```
 *
 * @since 2.0.0
 */
export function isIndex(err: DecodeError): err is Index {
  return err.tag === "Index";
}

/**
 * A refinement that returns true when a DecodeError is a Union.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.isUnion(D.unionErr(
 *   D.leafErr(1, "expected null"),
 *   D.leafErr(1, "expected string")
 * )); // true
 * const result2 = D.isUnion(D.manyErr()); // false
 * ```
 *
 * @since 2.0.0
 */
export function isUnion(err: DecodeError): err is Union {
  return err.tag === "Union";
}

/**
 * A refinement that returns true when a DecodeError is an Intersection.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.isIntersection(D.intersectionErr(
 *   D.leafErr(1, "expected null"),
 *   D.leafErr(1, "expected string")
 * )); // true
 * const result2 = D.isIntersection(D.manyErr()); // false
 * ```
 *
 * @since 2.0.0
 */
export function isIntersection(err: DecodeError): err is Intersection {
  return err.tag === "Intersection";
}

/**
 * A refinement that returns true when a DecodeError is a Many.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.isMany(D.intersectionErr(
 *   D.leafErr(1, "expected null"),
 *   D.leafErr(1, "expected string")
 * )); // false
 * const result2 = D.isMany(D.manyErr()); // true
 * ```
 *
 * @since 2.0.0
 */
export function isMany(err: DecodeError): err is Many {
  return err.tag === "Many";
}

/**
 * Construct a Lead from an unknown value and a reason for the decode error.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result = D.leafErr(1, "expected string");
 * ```
 *
 * @since 2.0.0
 */
export function leafErr(value: unknown, reason: string): DecodeError {
  return { tag: "Leaf", value, reason };
}

/**
 * Construct a Wrap from context and an existing DecodeError.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result = D.wrapErr(
 *   "expected password",
 *   D.leafErr(1, "expected string")
 * );
 * ```
 *
 * @since 2.0.0
 */
export function wrapErr(context: string, error: DecodeError): DecodeError {
  return { tag: "Wrap", context, error };
}

/**
 * Construct a Key from a key and an existing DecodeError.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result = D.keyErr(
 *   "title",
 *   D.leafErr(1, "expected string"),
 *   D.required,
 * );
 * ```
 *
 * @since 2.0.0
 */
export function keyErr(
  key: string,
  error: DecodeError,
  property: Property = optional,
): DecodeError {
  return { tag: "Key", key, property, error };
}

/**
 * Construct an Index from an index and an existing DecodeError.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result = D.indexErr(
 *   1,
 *   D.leafErr(1, "expected string"),
 *   D.required,
 * );
 * ```
 *
 * @since 2.0.0
 */
export function indexErr(
  index: number,
  error: DecodeError,
  property: Property = optional,
): DecodeError {
  return { tag: "Index", index, property, error };
}

/**
 * Construct a Union from two or more DecodeErrors.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result = D.unionErr(
 *   D.leafErr(1, "expected string"),
 *   D.leafErr(1, "expected array"),
 * );
 * ```
 *
 * @since 2.0.0
 */
export function unionErr(
  ...errors: readonly [DecodeError, DecodeError, ...DecodeError[]]
): DecodeError {
  const _errors = pipe(
    errors,
    A.chain((err) => isUnion(err) ? err.errors : [err]),
  ) as unknown as typeof errors;
  return { tag: "Union", errors: _errors };
}

/**
 * Construct an Intersection from two or more DecodeErrors.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result = D.intersectionErr(
 *   D.leafErr(1, "expected nonempty string"),
 *   D.leafErr(1, "expected string with no spaces"),
 * );
 * ```
 *
 * @since 2.0.0
 */
export function intersectionErr(
  ...errors: readonly [DecodeError, DecodeError, ...DecodeError[]]
): DecodeError {
  const _errors = pipe(
    errors,
    A.chain((err) => isIntersection(err) ? err.errors : [err]),
  ) as unknown as typeof errors;
  return { tag: "Intersection", errors: _errors };
}

/**
 * Construct a Many from zero or more DecodeErrors.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.manyErr(
 *   D.leafErr(1, "expected nonempty string"),
 *   D.leafErr(1, "expected string with no spaces"),
 * );
 * const result2 = D.manyErr();
 * ```
 *
 * @since 2.0.0
 */
export function manyErr(
  ...errors: readonly DecodeError[]
): DecodeError {
  const _errors = pipe(
    errors,
    A.chain((err) => isMany(err) ? err.errors : [err]),
  );
  return { tag: "Many", errors: _errors };
}

/**
 * Construct a catamorphism over DecodeError, mapping each case of a DecodeError
 * into the single type O.
 *
 * @example
 * ```ts
 * import type { DecodeError } from "./decoder.ts";
 * import * as D from "./decoder.ts";
 * import * as A from "./array.ts";
 *
 * const countErrors: (err: DecodeError) => number = D.match(
 *   () => 1,
 *   (_, err) => countErrors(err),
 *   (_, __, err) => countErrors(err),
 *   (_, __, err) => countErrors(err),
 *   A.reduce((acc, err) => acc + countErrors(err), 0),
 *   A.reduce((acc, err) => acc + countErrors(err), 0),
 *   A.reduce((acc, err) => acc + countErrors(err), 0),
 * );
 *
 * const result1 = countErrors(D.leafErr(1, "expected string")); // 1
 * const result2 = countErrors(D.manyErr(
 *   D.leafErr(1, "expected string"),
 *   D.leafErr(1, "expected string"),
 *   D.leafErr(1, "expected string"),
 * )); // 3
 * ```
 *
 * @since 2.0.0
 */
export function match<O>(
  Leaf: (value: unknown, reason: string) => O,
  Wrap: (context: string, error: DecodeError) => O,
  Key: (key: string, property: Property, error: DecodeError) => O,
  Index: (index: number, property: Property, error: DecodeError) => O,
  Union: (errors: readonly [DecodeError, DecodeError, ...DecodeError[]]) => O,
  Intersection: (
    errors: readonly [DecodeError, DecodeError, ...DecodeError[]],
  ) => O,
  Many: (errors: readonly DecodeError[]) => O,
): (e: DecodeError) => O {
  return (e) => {
    switch (e.tag) {
      case "Leaf":
        return Leaf(e.value, e.reason);
      case "Wrap":
        return Wrap(e.context, e.error);
      case "Key":
        return Key(e.key, e.property, e.error);
      case "Index":
        return Index(e.index, e.property, e.error);
      case "Union":
        return Union(e.errors);
      case "Intersection":
        return Intersection(e.errors);
      case "Many":
        return Many(e.errors);
    }
  };
}

/**
 * An internal helper that wraps JSON.stringify such that it returns an
 * Option<string> and handles any thrown errors.
 */
const stringify = O.tryCatch(JSON.stringify);

/**
 * An internal helper that maps a Leaf into a Forest<string>. This is used to
 * draw a DecodeError tree.
 */
function onLeaf(value: unknown, reason: string): Forest<string> {
  return pipe(
    stringify(value),
    O.map((str) => `cannot decode ${str}, should be ${reason}`),
    O.getOrElse(() => `cannot decode or render, should be ${reason}`),
    TR.of,
    A.of,
  );
}

/**
 * An internal helper that maps a Wrap into a Forest<string>. This is used to
 * draw a DecodeError tree.
 */
function onWrap(context: string, error: DecodeError): Forest<string> {
  return [TR.of(context, toForest(error))];
}

/**
 * An internal helper that maps a Key into a Forest<string>. This is used to
 * draw a DecodeError tree.
 */
function onKey(
  key: string,
  property: Property,
  error: DecodeError,
): Forest<string> {
  return [TR.of(`${property} property "${key}"`, toForest(error))];
}

/**
 * An internal helper that maps an Index into a Forest<string>. This is used to
 * draw a DecodeError tree.
 */
function onIndex(
  index: number,
  property: Property,
  error: DecodeError,
): Forest<string> {
  return [TR.of(`${property} index ${index}`, toForest(error))];
}

/**
 * An internal helper that maps a Union into a Forest<string>. This is used to
 * draw a DecodeError tree.
 */
function onUnion(
  errors: readonly [DecodeError, DecodeError, ...DecodeError[]],
): Forest<string> {
  return [
    TR.of(`cannot decode union (any of)`, pipe(errors, A.chain(toForest))),
  ];
}

/**
 * An internal helper that maps an Intersection into a Forest<string>. This is
 * used to draw a DecodeError tree.
 */
function onIntersection(
  errors: readonly [DecodeError, DecodeError, ...DecodeError[]],
): Forest<string> {
  return [
    TR.of(
      `cannot decode intersection (all of)`,
      pipe(errors, A.chain(toForest)),
    ),
  ];
}

/**
 * An internal helper that maps a Many into a Forest<string>. This is
 * used to draw a DecodeError tree.
 */
function onMany(errors: readonly DecodeError[]): Forest<string> {
  return pipe(errors, A.chain(toForest));
}

/**
 * An internal helper that maps a DecodeError into a Forest<string>. This is
 * used to draw a DecodeError tree.
 */
function toForest(err: DecodeError): Forest<string> {
  return pipe(
    err,
    match(onLeaf, onWrap, onKey, onIndex, onUnion, onIntersection, onMany),
  );
}

/**
 * Given a DecodeError, this function will produce a printable tree of errors.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.draw(D.leafErr(1, "string"));
 * // "cannot decode 1, should be string"
 *
 * const result2 = D.draw(D.wrapErr(
 *   "decoding password",
 *   D.leafErr(1, "string"),
 * ));
 * // decoding password
 * // └─ cannot decode 1, should be string
 * ```
 *
 * @since 2.0.0
 */
export function draw(err: DecodeError): string {
  return pipe(
    toForest(err),
    A.map(TR.drawTree),
    (results) => results.join("\n"),
  );
}

/**
 * Construct an empty DecodeError. This is a many that contains no errors.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result = D.empty(); // DecodeError
 * ```
 *
 * @since 2.0.0
 */
export function empty(): DecodeError {
  return manyErr();
}

/**
 * Combine two DecodeErrors into one. If both DecodeErrors are Unions then they
 * are merged into a Union, if they are both Intersections then are merged into
 * an Intersection, otherwise they are wrapped in a Many.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   D.leafErr(1, "string"),
 *   D.concat(D.leafErr("hello", "number")),
 * ); // Many[Leaf, Leaf]
 * ```
 *
 * @since 2.0.0
 */
export function concat(
  second: DecodeError,
): (first: DecodeError) => DecodeError {
  return (first) =>
    isIntersection(first) && isIntersection(second)
      ? intersectionErr(first, second)
      : isUnion(first) && isUnion(second)
      ? unionErr(first, second)
      : manyErr(first, second);
}

/**
 * The canonical implementation of Semigroup for DecodeError. It contains
 * the method concat.
 *
 * @since 2.0.0
 */
export const SemigroupDecodeError: Semigroup<DecodeError> = {
  concat,
};

/**
 * The canonical implementation of Monoid for DecodeError. It contains
 * the methods concat and empty.
 *
 * @since 2.0.0
 */
export const MonoidDecodeError: Monoid<DecodeError> = {
  concat,
  empty,
};

/**
 * The Decoded<A> type is an alias of Either<DecodeError, A>. This is the output
 * of a Decoder<A> when the parsing fails.
 *
 * @since 2.0.0
 */
export type Decoded<A> = Either<DecodeError, A>;

/**
 * Specifies Decoded as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindDecoded extends Kind {
  readonly kind: Decoded<Out<this, 0>>;
}

/**
 * Construct a Decoded<A> from a value A.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.success(1); // Decoder<number>;
 * const result2 = D.success("Hello"); // Decoder<string>;
 * ```
 *
 * @since 2.0.0
 */
export function success<A>(a: A): Decoded<A> {
  return E.right(a);
}

/**
 * Construct a Decoded<A> failure. Specifically, this constructs a Leaf
 * DecodeError and wraps it in Left.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.failure(1, "string");
 * // Represents a Decoded value that failed because a 1 was supplied
 * // when a string was expected.
 * ```
 *
 * @since 2.0.0
 */
export function failure<A = never>(actual: unknown, error: string): Decoded<A> {
  return E.left(leafErr(actual, error));
}

/**
 * Construct a Decoded<A> from a DecodeError. This allows one to construct a
 * Decoded failure directly from DecodeErrors other than Leaf.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.fromDecodeError(D.wrapErr(
 *   "decoding password",
 *   D.leafErr(1, "string"),
 * ));
 * ```
 *
 * @since 2.0.0
 */
export function fromDecodeError<A = never>(err: DecodeError): Decoded<A> {
  return E.left(err);
}

/**
 * A combinator over Decoded<A> that maps a DecodeError into a printable tree.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   D.failure(1, "string"),
 *   D.extract,
 * ); // Left("cannot decode 1, should be string")
 * const result2 = pipe(
 *   D.success(1),
 *   D.extract
 * ); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function extract<A>(ta: Decoded<A>): Either<string, A> {
  return pipe(ta, E.mapLeft(draw));
}

/**
 * The canonical instance of Monad for Decoded. It contains the methods of, ap, map,
 * join, and chain.
 *
 * @since 2.0.0
 */
export const MonadDecoded: Monad<KindDecoded> = E.getRightMonad(
  SemigroupDecodeError,
);

/**
 * A traversal over a Record of Decoded results.
 */
const traverseRecord = R.traverse(MonadDecoded);

/**
 * A traversal over an Array of Decoded results.
 */
const traverseArray = A.traverse(MonadDecoded);

/**
 * The Decoder<D, A> type represents a function that parses some input D into a
 * value A or a DecodeError. This isn't true parsing of a grammar but instead a
 * combination of refinement and error tracking.
 *
 * @since 2.0.0
 */
export type Decoder<D, A> = FnEither<D, DecodeError, A>;

/**
 * A type that matches any decoder type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyDecoder = Decoder<unknown, any>;

/**
 * Specifies Decoder as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions and
 * contravariant paramter D corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindDecoder extends Kind {
  readonly kind: Decoder<In<this, 0>, Out<this, 0>>;
}

/**
 * Construct a Decoder<A, A> from a Predicate<A> and a reason for failure or a
 * Decoder<A, B> from a Refinement<A, B> and a reason for failure. While
 * decoding, the value A is passed to the predicate/refinement. If it returns
 * true then the result is wrapped in Success, otherwise the value and reason
 * are wrapped in Failure.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import * as R from "./refinement.ts";
 * import { pipe } from "./fn.ts";
 *
 * const nonEmpty = D.fromPredicate(
 *   (s: string) => s.length > 0, // Predicate
 *   "nonempty string"
 * );
 * const string = D.fromPredicate(R.string, "string");
 * const nonEmptyString = pipe(
 *   string,
 *   D.compose(nonEmpty),
 * );
 *
 * const result1 = nonEmptyString(null); // Left(DecodeError)
 * const result2 = nonEmptyString(""); // Left(DecodeError)
 * const result3 = nonEmptyString("Hello"); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function fromPredicate<B, A extends B>(
  guard: Refinement<B, A>,
  expected: string,
): Decoder<B, A>;
export function fromPredicate<B, A extends B>(
  guard: Predicate<A>,
  expected: string,
): Decoder<B, A>;
export function fromPredicate<A>(
  guard: Predicate<A>,
  expected: string,
): Decoder<A, A> {
  return (a: A) => guard(a) ? success(a) : failure(a, expected);
}

/**
 * Create a Decoder<D, A> from a constant value A.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const one = D.of("one");
 *
 * const result = one(null); // Right("one")
 * ```
 *
 * @since 2.0.0
 */
export function of<A, D = unknown>(a: A): Decoder<D, A> {
  return MonadDecoder.of(a);
}

/**
 * Given a Decoder returning a function A => I and a Decoder returning a value
 * A, combine them into a Decoder returning I.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string; age: number };
 * const person = (name: string) => (age: number): Person => ({ name, age });
 *
 * const result = pipe(
 *   D.of(person),
 *   D.ap(D.of("Brandon")),
 *   D.ap(D.of(37)),
 * ); // Decoder<unknown, Person>
 * ```
 *
 * @since 2.0.0
 */
export function ap<A, D = unknown>(
  ua: Decoder<D, A>,
): <I>(ufai: Decoder<D, (a: A) => I>) => Decoder<D, I> {
  return MonadDecoder.ap(ua);
}

/**
 * Provide an alternative Decoder to fallback against if the first one fails.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numOrStr = pipe(
 *   D.string,
 *   D.alt(D.number),
 * );
 *
 * const result1 = numOrStr(0); // Right(0)
 * const result2 = numOrStr("Hello"); // Right("Hello")
 * const result3 = numOrStr(null); // Left(DecodeError)
 * ```
 *
 * @since 2.0.0
 */
export function alt<A, D>(
  second: Decoder<D, A>,
): <I>(first: Decoder<D, I>) => Decoder<D, A | I> {
  return (first) => (d) => {
    const fst = first(d);
    if (E.isRight(fst)) {
      return fst;
    }
    const snd = second(d);
    if (E.isRight(snd)) {
      return snd;
    }
    return fromDecodeError(unionErr(fst.left, snd.left));
  };
}

/**
 * Map over the output of a Decoder.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stringLength = pipe(
 *   D.string,
 *   D.map(s => s.length),
 * );
 *
 * const result1 = stringLength(null); // Left(DecodeError)
 * const result2 = stringLength(""); // Right(0)
 * const result3 = stringLength("Hello"); // Right(5)
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <D = unknown>(ua: Decoder<D, A>) => Decoder<D, I> {
  return MonadDecoder.map(fai);
}

/**
 * Collapse a Decoder that returns a Decoder into a new Decoder.
 *
 * @since 2.0.0
 */
export function join<D, A>(
  uua: Decoder<D, Decoder<D, A>>,
): Decoder<D, A> {
  return MonadDecoder.join(uua);
}

/**
 * Chain the result of one decoder into a new decoder.
 *
 * @since 2.0.0
 */
export function chain<A, I, D = unknown>(
  faui: (a: A) => Decoder<D, I>,
): (ua: Decoder<D, A>) => Decoder<D, I> {
  return MonadDecoder.chain(faui);
}

/**
 * Annotate the DecodeError output of an existing Decoder if it fails while
 * parsing. Internally, this uses the DecodeError Wrap constructor.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const decoder = pipe(
 *   D.literal("a", "b", "c", 1, 2, 3),
 *   D.annotate("like the song"),
 * );
 *
 * const result1 = decoder(1); // Right(1)
 * const result2 = D.extract(decoder("d"));
 * // Left(`like the song
 * // └─ cannot decode "d", should be "a", "b", "c", 1, 2, 3`)
 *
 * ```
 *
 * @since 2.0.0
 */
export function annotate(
  context: string,
): <D, A>(decoder: Decoder<D, A>) => Decoder<D, A> {
  return FE.mapLeft((error) => wrapErr(context, error));
}

/**
 * Create a Decoder<D, D> from a type D.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const num = D.id<number>();
 *
 * const result1 = num(1); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function id<D = unknown>(): Decoder<D, D> {
  return E.right;
}

/**
 * Compose two Decoders where the input to second aligns with the output of
 * first.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import * as S from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const prefixed = <T extends string>(prefix: T) =>
 *   D.fromPredicate(S.startsWith(prefix), `prefixed with "${prefix}"`);
 *
 * const eventMethod = pipe(
 *   D.string,
 *   D.compose(prefixed("on")),
 * );
 *
 * const result1 = eventMethod(null); // Left(DecodeError)
 * const result2 = eventMethod("hello"); // Left(DecodeError)
 * const result3 = eventMethod("onClick"); // Right("onClick");
 * ```
 *
 * @since 2.0.0
 */
export function compose<B, C>(
  second: Decoder<B, C>,
): <A>(first: Decoder<A, B>) => Decoder<A, C> {
  return FE.compose(second);
}

/**
 * Map over the input of a Decoder contravariantly. This allows one to use an
 * existing decoder against a transformed input.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const fromStr = pipe(
 *   D.tuple(D.string, D.string),
 *   D.contramap((s) => [s, s] as const),
 * );
 *
 * const result1 = fromStr("hello"); // Right(["hello", "hello"])
 * const result2 = fromStr(null); // Left(DecodeError)
 * ```
 *
 * @since 2.0.0
 */
export function contramap<L, D>(
  fld: (l: L) => D,
): <A>(ua: Decoder<D, A>) => Decoder<L, A> {
  return FE.contramap(fld);
}

/**
 * Map over the input and output of a Decoder. This is effectively a combination
 * of map and contramap in a single operator.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const fromStr = pipe(
 *   D.tuple(D.string, D.string),
 *   D.dimap(
 *     (s) => [s, s],
 *     ([s]) => [s, s.length] as const,
 *   ),
 * );
 *
 * const result1 = fromStr("hello"); // Right(["hello", 5])
 * const result2 = fromStr(null); // Left(DecodeError)
 * ```
 *
 * @since 2.0.0
 */
export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
): (ua: Decoder<D, A>) => Decoder<L, I> {
  return FE.dimap(fld, fai);
}

/**
 * Apply a refinement or predicate to the output of an existing Decoder. This is
 * useful for building complicated Decoders.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const nonEmptyString = pipe(
 *   D.string,
 *   D.refine(s => s.length > 0, "nonempty"),
 * );
 *
 * const result1 = nonEmptyString(null); // Left(DecodeError)
 * const result2 = nonEmptyString(""); // Left(DecodeError)
 * const result3 = nonEmptyString("Hello"); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function refine<A, B extends A>(
  refinement: Refinement<A, B>,
  id: string,
): <I>(from: Decoder<I, A>) => Decoder<I, B>;
export function refine<A>(
  refinement: Predicate<A>,
  id: string,
): <I>(from: Decoder<I, A>) => Decoder<I, A>;
export function refine<A>(
  refinement: Predicate<A>,
  id: string,
): <I>(from: Decoder<I, A>) => Decoder<I, A> {
  return compose(fromPredicate(refinement, id));
}

/**
 * An internal helper that maps a Literal to a string for use
 * in DecodeErrors
 */
const literalToString = (literal: S.Literal): string =>
  typeof literal === "string" ? `"${literal}"` : `${literal}`;

/**
 * Create a Decoder from a list of literal values. Literal values can be
 * strings, numbers, booleans, null, or undefined. This decoder will only return
 * Right if the value being decoded has object equality with one of the literals
 * supplied.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const firstThree = D.literal(1, 2, 3);
 *
 * const result1 = firstThree(0); // Left(DecodeError)
 * const result2 = firstThree(1); // Right(1)
 * const result3 = firstThree(2); // Right(2)
 * const result4 = firstThree(3); // Right(3)
 * const result5 = firstThree(null); // Left(DecodeError)
 * ```
 *
 * @since 2.0.0
 */
export function literal<A extends NonEmptyArray<Literal>>(
  ...literals: A
): Decoder<unknown, A[number]> {
  return fromPredicate(
    G.literal(...literals),
    literals.map(literalToString).join(", "),
  ) as unknown as Decoder<unknown, A[number]>;
}

/**
 * A Decoder that always returns true and casts the result to unknown.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.unknown(null); // Right(null)
 * const result2 = D.unknown("Brandon"); // Right("Brandon")
 * ```
 *
 * @since 2.0.0
 */
export const unknown: Decoder<unknown, unknown> = E.right;

/**
 * A Decoder that validates strings.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.string(null); // Left(DecodeError)
 * const result2 = D.string("Hello"); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export const string: Decoder<unknown, string> = fromPredicate(
  G.string,
  "string",
);

/**
 * A Decoder that validates numbers.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.number(null); // Left(DecodeError)
 * const result2 = D.number(1); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export const number: Decoder<unknown, number> = fromPredicate(
  G.number,
  "number",
);

/**
 * A Decoder that validates booleans.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.boolean(null); // Left(DecodeError)
 * const result2 = D.boolean(true); // Right(true)
 * ```
 *
 * @since 2.0.0
 */
export const boolean: Decoder<unknown, boolean> = fromPredicate(
  G.boolean,
  "boolean",
);

/**
 * A Decoder that attempts to decode a Date using new Date(value). If the
 * process of calling new Date throws or the getTime method on the new date
 * object returns NaN, then a failure is returned. If a Date can be derived from
 * the object then a Date object is returned.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const result1 = D.date(null); // Left(DecodeError)
 * const result2 = D.date(Date.now()); // Right(Date)
 * const result3 = D.date("1990"); // Right(Date)
 * const result4 = D.date(new Date()); // Right(Date)
 * ```
 *
 * @since 2.0.0
 */
export function date(a: unknown): Decoded<Date> {
  try {
    // deno-lint-ignore no-explicit-any
    const _date = new Date(a as any);
    return isNaN(_date.getTime()) ? failure(a, "date") : success(_date);
  } catch {
    return failure(a, "date");
  }
}

/**
 * A Decoder that checks that an object is both an Array and that it's length is
 * N.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const two = D.arrayN(2);
 *
 * const result1 = two(null); // Left(DecodeError)
 * const result2 = two([]); // Left(DecodeError)
 * const result3 = two(["hello"]); // Left(DecodeError)
 * const result4 = two(["hello", 2]); // Right(["hello", 2])
 * ```
 *
 * @since 2.0.0
 */
export function arrayN<N extends number>(
  length: N,
): Decoder<unknown, Array<unknown> & { length: N }> {
  return fromPredicate(G.isArrayN(length), `tuple of length ${length}`);
}

/**
 * A Decoder combinator that will check that a value is a string and then
 * attempt to parse it as JSON.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const person = D.struct({
 *   name: D.string,
 *   age: D.number,
 * });
 * const json = D.json(person);
 *
 * const result1 = json(null); // Left(DecodeError)
 * const result2 = json(""); // Left(DecodeError)
 * const result3 = json('{"name":"Brandon","age":37}');
 * // Right({ name: "Brandon", age: 37 })
 * ```
 *
 * @since 2.0.0
 */
export function json<A>(decoder: Decoder<unknown, A>): Decoder<unknown, A> {
  return pipe(
    string,
    compose((s) => {
      try {
        return success(JSON.parse(s));
      } catch {
        return failure(s, "json");
      }
    }),
    compose(decoder),
  );
}

/**
 * A Decoder combinator that intersects two existing decoders. The resultant
 * decoder ensures that an input matches both decoders. Nested intersection
 * combinators will combine and flatten their error trees.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const person = pipe(
 *   D.struct({ name: D.string }),
 *   D.intersect(D.partial({ age: D.string })),
 * );
 *
 * const result1 = person(null); // Left(DecodeError)
 * const result2 = person({ name: "Brandon" }); // Right({ name: "Brandon" })
 * const result3 = person({ name: "Brandon", age: 37 });
 * // Right({ name: "Brandon", age: 37 })
 * const result4 = person({ age: 37 }); // Left(DecodeError)
 * ```
 *
 * @since 2.0.0
 */
export function intersect<B, I>(
  second: Decoder<B, I>,
): <A>(first: Decoder<B, A>) => Decoder<B, S.Spread<A & I>> {
  return <A>(first: Decoder<B, A>): Decoder<B, S.Spread<A & I>> => (a) => {
    const fst = first(a) as Decoded<S.Spread<A & I>>;
    const snd = second(a) as Decoded<S.Spread<A & I>>;

    if (E.isRight(snd) && E.isRight(fst)) {
      return success(
        Object.assign({}, fst.right, snd.right),
      );
    }

    if (E.isLeft(fst)) {
      if (E.isLeft(snd)) {
        return fromDecodeError(
          intersectionErr(fst.left, snd.left),
        );
      }
      return fst;
    }
    return snd;
  };
}

/**
 * Provide an alternative Decoder to fallback against if the first one fails.
 * This is an alias of alt.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * const numOrStr = pipe(
 *   D.string,
 *   D.union(D.number),
 * );
 *
 * const result1 = numOrStr(0); // Right(0)
 * const result2 = numOrStr("Hello"); // Right("Hello")
 * const result3 = numOrStr(null); // Left(DecodeError)
 * ```
 *
 * @since 2.0.0
 */
export function union<B, I>(
  right: Decoder<B, I>,
): <A>(left: Decoder<B, A>) => Decoder<B, A | I> {
  return alt(right);
}

/**
 * An internal literal instance over null used in the nullable combinator.
 *
 * @since 2.0.0
 */
export const _null = literal(null);

/**
 * A decoder combinator that modifies an existing decoder to accept null as an
 * input value and a successful return value.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const orNull = D.nullable(D.string);
 *
 * const result1 = orNull(null); // Right(null)
 * const result2 = orNull(2); // Left(DecodeError)
 * const result3 = orNull("Hello"); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function nullable<D, A>(
  second: Decoder<D, A>,
): Decoder<D | null, A | null> {
  return pipe(_null, union(second)) as Decoder<D | null, A | null>;
}

/**
 * An internal literal instance over undefined used in the undefinable combinator.
 *
 * @since 2.0.0
 */
export const _undefined = literal(undefined);

/**
 * A decoder combinator that modifies an existing decoder to accept undefined
 * as an input value and a successful return value.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const orUndefined = D.undefinable(D.string);
 *
 * const result1 = orUndefined(undefined); // Right(null)
 * const result2 = orUndefined(2); // Left(DecodeError)
 * const result3 = orUndefined("Hello"); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function undefinable<D, A>(
  second: Decoder<D, A>,
): Decoder<D | undefined, A | undefined> {
  return pipe(_undefined, union(second)) as Decoder<
    D | undefined,
    A | undefined
  >;
}

/**
 * An internal optimization decoder that checks that an input is a non-null
 * object.
 *
 * @since 2.0.0
 */
const _record = fromPredicate(G.isRecord, "record");

/**
 * A decoder against a record with string keys and values that match the items
 * decoder.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const strings = D.record(D.string);
 *
 * const result1 = strings(null); // Left(DecodeError)
 * const result2 = strings({}); // Right({})
 * const result3 = strings([]); // Right({})
 * const result4 = strings({"one": 1}); // Left(DecodeError)
 * const result5 = strings({ one: "one" }); // Right({ one: "one" })
 * ```
 *
 * @since 2.0.0
 */
export function record<A>(
  items: Decoder<unknown, A>,
): Decoder<unknown, ReadonlyRecord<A>> {
  return flow(
    _record,
    E.chain(flow(
      traverseRecord((a, index) =>
        pipe(items(a), E.mapLeft((e) => keyErr(index, e)))
      ),
      E.mapLeft((e) => wrapErr("cannot decode record", e)),
    )),
  );
}

/**
 * An internal optimization decoder that checks that an input is an array.
 *
 * @since 2.0.0
 */
const _array = fromPredicate(G.isArray, "array");

/**
 * A decoder against an array with only values that adhere to the passed in
 * items decoder.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const strings = D.array(D.string);
 *
 * const result1 = strings(null); // Left(DecodeError)
 * const result2 = strings({}); // Left(DecodeError)
 * const result3 = strings([]); // Right([])
 * const result4 = strings([1, 2, 3]); // Left(DecodeError)
 * const result5 = strings(["one", "two"]); // Right(["one", "two"])
 * ```
 *
 * @since 2.0.0
 */
export function array<A>(
  items: Decoder<unknown, A>,
): Decoder<unknown, ReadonlyArray<A>> {
  return flow(
    _array,
    E.chain(flow(
      traverseArray((a, index) =>
        pipe(items(a), E.mapLeft((e) => indexErr(index, e)))
      ),
      E.mapLeft((e) => wrapErr("cannot decode array", e)),
    )),
  );
}

/**
 * A decoder over a heterogenous tuple. This tuple can have different values for
 * each tuple element, but is constrained to a specific size and order.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const tuple = D.tuple(D.string, D.number);
 *
 * const result1 = tuple([]); // Left(DecodeError)
 * const result2 = tuple([3, "Hello"]); // Left(DecodeError)
 * const result3 = tuple(["Brandon", 37]); // Right(["Brandon", 37])
 * ```
 *
 * @since 2.0.0
 */
export function tuple<A extends AnyArray>(
  ...items: { [K in keyof A]: Decoder<unknown, A[K]> }
): Decoder<unknown, { readonly [K in keyof A]: A[K] }> {
  return flow(
    arrayN(items.length),
    E.chain(
      traverseArray((a, index) => {
        const decoder: AnyDecoder = items[index];
        return pipe(
          decoder(a),
          E.mapLeft((e) => indexErr(index, e, "required")),
        );
      }),
    ),
    E.mapLeft((e) => wrapErr("cannot decode tuple", e)),
  ) as Decoder<unknown, { [K in keyof A]: A[K] }>;
}

/**
 * An internal helper function that traverses a structure, decoding each entry
 * in the struct with its corresponding decoder.
 *
 * @since 2.0.0
 */
const traverseStruct =
  (items: Record<string, Decoder<unknown, unknown>>) =>
  (a: Record<string, unknown>) =>
    pipe(
      items,
      traverseRecord((decoder, key) =>
        pipe(
          decoder(a[key]),
          E.mapLeft((e) => keyErr(key, e, "required")),
        )
      ),
    );

/**
 * A decoder over a heterogenous record type. This struct can have different
 * values at each key, and the resultant decoder will ensure that each key
 * matches its corresponding decoder.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const person = D.struct({ name: D.string, age: D.number });
 *
 * const result1 = person({}); // Left(DecodeError)
 * const result2 = person(null); // Left(DecodeError)
 * const result3 = person({ name: "Brandon" }); // Left(DecodeError)
 * const result4 = person({ name: "Brandon", age: 37 });
 * // Right({ name: "Brandon", age: 37 })
 * ```
 *
 * @since 2.0.0
 */
export function struct<A>(
  items: { [K in keyof A]: Decoder<unknown, A[K]> },
): Decoder<unknown, { readonly [K in keyof A]: A[K] }> {
  return flow(
    _record,
    E.chain(traverseStruct(items)),
    E.mapLeft((e) => wrapErr("cannot decode struct", e)),
  ) as Decoder<unknown, { [K in keyof A]: A[K] }>;
}

/**
 * An internal helper decoded value that represents a partial value that does
 * not exist in the record being decoded.
 *
 * @since 2.0.0
 */
const skipProperty: Decoded<E.Either<void, unknown>> = success(
  E.left(undefined),
);

/**
 * An internal helper decoded value that represents a partial value that does
 * exists but is undefined.
 *
 * @since 2.0.0
 */
const undefinedProperty: Decoded<E.Either<void, unknown>> = success(
  E.right(undefined),
);

/**
 * An internal helper function that traverses a partial, decoding each entry
 * in the struct with its corresponding decoder and handling the cases where a
 * property does not exist on the struct and where a property is undefined.
 *
 * @since 2.0.0
 */
const traversePartial =
  (items: Record<string, Decoder<unknown, unknown>>) =>
  (a: Record<string, unknown>) =>
    pipe(
      items,
      traverseRecord((decoder, key) => {
        if (a[key] === undefined) {
          return key in a ? undefinedProperty : skipProperty;
        }
        return pipe(
          decoder(a[key]),
          E.bimap((e) => keyErr(key, e), E.right),
        );
      }),
    );

/**
 * An internal helper that is used to construct a partial record where
 * Left values are not added to the resultant record.
 *
 * @since 2.0.0
 */
const compactRecord = <A>(
  r: Record<string, E.Either<void, A>>,
): Record<string, A> => {
  const out: Record<string, A> = {};
  for (const k in r) {
    const rk = r[k];
    if (E.isRight(rk)) {
      out[k] = rk.right;
    }
  }
  return out;
};

/**
 * A decoder over a heterogenous record type. This struct can have different
 * values at each key or the key can not exist or the value can be undefined,
 * and the resultant decoder will ensure that each key
 * matches its corresponding decoder.
 *
 * @example
 * ```ts
 * import * as D from "./decoder.ts";
 *
 * const person = D.partial({ name: D.string, age: D.number });
 *
 * const result1 = person({}); // Right({})
 * const result2 = person(null); // Left(DecodeError)
 * const result3 = person({ name: "Brandon" }); // Right({ name: "Brandon" })
 * const result4 = person({ name: "Brandon", age: 37 });
 * // Right({ name: "Brandon", age: 37 })
 * ```
 *
 * @since 2.0.0
 */
export function partial<A>(
  items: { [K in keyof A]: Decoder<unknown, A[K]> },
): Decoder<unknown, { readonly [K in keyof A]?: A[K] }> {
  return flow(
    _record,
    E.chain(traversePartial(items)),
    E.bimap((e) => wrapErr("cannot decode partial struct", e), compactRecord),
  ) as Decoder<unknown, { readonly [K in keyof A]: A[K] }>;
}

/**
 * The Lazy decoder combinator allows for the creation of recursive or mutually
 * recursive decoding. The passed decoder thunk is memoized to keep the vm from
 * falling into an infinite loop.
 *
 * @example
 * ```ts
 * import type { Decoder } from "./decoder.ts";
 *
 * import * as D from "./decoder.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string; age: number; children: ReadonlyArray<Person> };
 * const person = (
 *   name: string,
 *   age: number,
 *   children: ReadonlyArray<Person> = []
 * ): Person => ({ name, age, children });
 *
 * const decode: Decoder<unknown, Person> = D.lazy(
 *   "Person",
 *   () => D.struct({ name: D.string, age: D.number, children: D.array(decode) }),
 * );
 *
 * const rufus = person("Rufus", 1);
 * const brandon = person("Brandon", 37, [rufus]);
 * const jackie = person("Jackie", 57, [brandon]);
 *
 * const result1 = decode(null); // Left(DecodeError)
 * const result2 = decode(rufus); // Right(rufus)
 * const result3 = decode(brandon); // Right(brandon)
 * const result4 = decode(jackie); // Right(jackie)
 * ```
 *
 * @since 2.0.0
 */
export function lazy<D, A>(
  id: string,
  decoder: () => Decoder<D, A>,
): Decoder<D, A> {
  const get = memoize<void, Decoder<D, A>>(decoder);
  return (u) => pipe(get()(u), E.mapLeft((e) => wrapErr(`lazy type ${id}`, e)));
}

/**
 * Specifies Decoder<unknown, A> as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions. This is a
 * specific Kind used to construct the Schemable Decoder.
 *
 * @since 2.0.0
 */
export interface KindUnknownDecoder extends Kind {
  readonly kind: Decoder<unknown, Out<this, 0>>;
}

/**
 * The canonical implementation of Functor for Decoder. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const FunctorDecoder: Functor<KindDecoder> = { map };

/**
 * The canonical implementation of Apply for Decoder. It contains
 * the methods ap and map.
 *
 * @since 2.0.0
 */
export const ApplyDecoder: Apply<KindDecoder> = { ap, map };

/**
 * The canonical implementation of Applicative for Decoder. It contains
 * the methods of, ap, and map.
 *
 * @since 2.0.0
 */
export const ApplicativeDecoder: Applicative<KindDecoder> = { of, ap, map };

/**
 * The canonical implementation of Chain for Decoder. It contains
 * the methods ap, map, and chain.
 *
 * @since 2.0.0
 */
export const ChainDecoder: Chain<KindDecoder> = { ap, map, chain };

/**
 * The canonical implementation of Monad for Decoder. It contains
 * the methods of, ap, map, join, and chain.
 *
 * @since 2.0.0
 */
export const MonadDecoder: Monad<KindDecoder> = FE.getRightMonad(
  SemigroupDecodeError,
);

/**
 * The canonical implementation of Alt for Decoder. It contains
 * the methods alt and map
 *
 * @since 2.0.0
 */
export const AltDecoder: Alt<KindDecoder> = { alt, map };

/**
 * The canonical implementation of Schemable for Decoder. It contains
 * the methods unknown, string, number, boolean, literal, nullable, undefinable,
 * record, array, tuple, struct, partial, intersect, union, and lazy.
 *
 * @since 2.0.0
 */
export const SchemableDecoder: Schemable<KindUnknownDecoder> = {
  unknown: () => unknown,
  string: () => string,
  number: () => number,
  boolean: () => boolean,
  literal,
  nullable,
  undefinable,
  record,
  array,
  tuple: tuple as Schemable<KindUnknownDecoder>["tuple"],
  struct,
  partial,
  intersect,
  union,
  lazy,
};
