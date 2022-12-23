/**
 * The DecodeError ADT is used to collect the error structure of a Decoder. This
 * is useful for displaying the structural locations of any decode failures.
 *
 * @module DecodeError
 *
 * @since 2.0.0
 */

import type { Semigroup } from "./semigroup.ts";
import type { Monoid } from "./monoid.ts";
import type { Forest } from "./tree.ts";

import * as TR from "./tree.ts";
import * as A from "./array.ts";
import * as O from "./option.ts";
import { pipe } from "./fn.ts";

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
 * The Many type is used to represent zero or more DecoderErrors without
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.isLeaf(DE.leaf(1, "expected string")); // true
 * const result2 = DE.isLeaf(DE.many()); // false
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.isWrap(DE.wrap(
 *   "This is some context",
 *   DE.leaf(1, "expected string")
 * )); // true
 * const result2 = DE.isWrap(DE.many()); // false
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.isKey(DE.key(
 *   "one",
 *   DE.leaf(1, "expected string")
 * )); // true
 * const result2 = DE.isKey(DE.many()); // false
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.isIndex(DE.index(
 *   1,
 *   DE.leaf(1, "expected string")
 * )); // true
 * const result2 = DE.isIndex(DE.many()); // false
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.isUnion(DE.union(
 *   DE.leaf(1, "expected null"),
 *   DE.leaf(1, "expected string")
 * )); // true
 * const result2 = DE.isUnion(DE.many()); // false
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.isIntersection(DE.intersection(
 *   DE.leaf(1, "expected null"),
 *   DE.leaf(1, "expected string")
 * )); // true
 * const result2 = DE.isIntersection(DE.many()); // false
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.isMany(DE.intersection(
 *   DE.leaf(1, "expected null"),
 *   DE.leaf(1, "expected string")
 * )); // false
 * const result2 = DE.isMany(DE.many()); // true
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
 * import * as DE from "./decode_error.ts";
 *
 * const result = DE.leaf(1, "expected string");
 * ```
 *
 * @since 2.0.0
 */
export function leaf(value: unknown, reason: string): DecodeError {
  return { tag: "Leaf", value, reason };
}

/**
 * Construct a Wrap from context and an existing DecodeError.
 *
 * @example
 * ```ts
 * import * as DE from "./decode_error.ts";
 *
 * const result = DE.wrap(
 *   "expected password",
 *   DE.leaf(1, "expected string")
 * );
 * ```
 *
 * @since 2.0.0
 */
export function wrap(context: string, error: DecodeError): DecodeError {
  return { tag: "Wrap", context, error };
}

/**
 * Construct a Key from a key and an existing DecodeError.
 *
 * @example
 * ```ts
 * import * as DE from "./decode_error.ts";
 *
 * const result = DE.key(
 *   "title",
 *   DE.leaf(1, "expected string"),
 *   DE.required,
 * );
 * ```
 *
 * @since 2.0.0
 */
export function key(
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
 * import * as DE from "./decode_error.ts";
 *
 * const result = DE.index(
 *   1,
 *   DE.leaf(1, "expected string"),
 *   DE.required,
 * );
 * ```
 *
 * @since 2.0.0
 */
export function index(
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
 * import * as DE from "./decode_error.ts";
 *
 * const result = DE.union(
 *   DE.leaf(1, "expected string"),
 *   DE.leaf(1, "expected array"),
 * );
 * ```
 *
 * @since 2.0.0
 */
export function union(
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
 * import * as DE from "./decode_error.ts";
 *
 * const result = DE.intersection(
 *   DE.leaf(1, "expected nonempty string"),
 *   DE.leaf(1, "expected string with no spaces"),
 * );
 * ```
 *
 * @since 2.0.0
 */
export function intersection(
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.many(
 *   DE.leaf(1, "expected nonempty string"),
 *   DE.leaf(1, "expected string with no spaces"),
 * );
 * const result2 = DE.many();
 * ```
 *
 * @since 2.0.0
 */
export function many(
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
 * import type { DecodeError } from "./decode_error.ts";
 * import * as DE from "./decode_error.ts";
 * import * as A from "./array.ts";
 *
 * const countErrors: (err: DecodeError) => number = DE.match(
 *   () => 1,
 *   (_, err) => countErrors(err),
 *   (_, __, err) => countErrors(err),
 *   (_, __, err) => countErrors(err),
 *   A.reduce((acc, err) => acc + countErrors(err), 0),
 *   A.reduce((acc, err) => acc + countErrors(err), 0),
 *   A.reduce((acc, err) => acc + countErrors(err), 0),
 * );
 *
 * const result1 = countErrors(DE.leaf(1, "expected string")); // 1
 * const result2 = countErrors(DE.many(
 *   DE.leaf(1, "expected string"),
 *   DE.leaf(1, "expected string"),
 *   DE.leaf(1, "expected string"),
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
 * import * as DE from "./decode_error.ts";
 *
 * const result1 = DE.draw(DE.leaf(1, "string"));
 * // "cannot decode 1, should be string"
 *
 * const result2 = DE.draw(DE.wrap(
 *   "decoding password",
 *   DE.leaf(1, "string"),
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
 * import * as DE from "./decode_error.ts";
 *
 * const result = DE.empty(); // DecodeError
 * ```
 *
 * @since 2.0.0
 */
export function empty(): DecodeError {
  return many();
}

/**
 * Combine two DecodeErrors into one. If both DecodeErrors are Unions then they
 * are merged into a Union, if they are both Intersections then are merged into
 * an Intersection, otherwise they are wrapped in a Many.
 *
 * @example
 * ```ts
 * import * as DE from "./decode_error.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   DE.leaf(1, "string"),
 *   DE.concat(DE.leaf("hello", "number")),
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
      ? intersection(first, second)
      : isUnion(first) && isUnion(second)
      ? union(first, second)
      : many(first, second);
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
