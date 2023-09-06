/**
 * Schemable presents a unified algebra for parsing, decoding
 * guarding, or otherwise building typed js structures in
 * TypeScript.
 *
 * @module Schemable
 * @since 2.0.0
 */

import type { $, Hold, Kind, Spread } from "./kind.ts";
import type { NonEmptyArray } from "./array.ts";
import type { ReadonlyRecord } from "./record.ts";

import { memoize } from "./fn.ts";

/**
 * These are the super-types that a Literal schema must extent.
 * They are used to constrain the inputs for LiteralSchemable.
 *
 * @since 2.0.0
 */
export type Literal = string | number | boolean | null | undefined;

/**
 * Wraps an unknown type in Schemable. This is the best escape
 * hatch when a Schema isn't known ahead of time.
 *
 * @since 2.0.0
 */
export interface UnknownSchemable<U extends Kind> extends Hold<U> {
  readonly unknown: <B, C, D, E>() => $<U, [unknown, B, C], [D], [E]>;
}

/**
 * Wraps a string type in Schemable.
 *
 * @since 2.0.0
 */
export interface StringSchemable<U extends Kind> extends Hold<U> {
  readonly string: <B, C, D, E>() => $<U, [string, B, C], [D], [E]>;
}

/**
 * Wraps a number type in Schemable.
 *
 * @since 2.0.0
 */
export interface NumberSchemable<U extends Kind> extends Hold<U> {
  readonly number: <B, C, D, E>() => $<U, [number, B, C], [D], [E]>;
}

/**
 * Wraps a boolean type in Schemable.
 *
 * @since 2.0.0
 */
export interface BooleanSchemable<U extends Kind> extends Hold<U> {
  readonly boolean: <B, C, D, E>() => $<U, [boolean, B, C], [D], [E]>;
}

/**
 * Wraps a union of literals in Schemable.
 *
 * @since 2.0.0
 */
export interface LiteralSchemable<U extends Kind> extends Hold<U> {
  readonly literal: <A extends NonEmptyArray<Literal>, B, C, D, E>(
    ...s: A
  ) => $<U, [A[number], B, C], [D], [E]>;
}

/**
 * Takes a Schemable<A> and returns a Schemable<A | null>;
 *
 * @since 2.0.0
 */
export interface NullableSchemable<U extends Kind> extends Hold<U> {
  readonly nullable: <A, B, C, D, E>(
    or: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [A | null, B, C], [D], [E]>;
}

/**
 * Takes a Schemable<A> and returns a Schemable<A | undefined>;
 *
 * @since 2.0.0
 */
export interface UndefinableSchemable<U extends Kind> extends Hold<U> {
  readonly undefinable: <A, B, C, D, E>(
    or: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [A | undefined, B, C], [D], [E]>;
}

/**
 * Takes a Schemable<A> and returns a Schemable<ReadonlyRecord<A>>
 *
 * @since 2.0.0
 */
export interface RecordSchemable<U extends Kind> extends Hold<U> {
  readonly record: <A, B, C, D, E>(
    codomain: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [ReadonlyRecord<A>, B, C], [D], [E]>;
}

/**
 * Takes a Schemable<A> and returns a Schemable<ReadonlyArray<A>>
 *
 * @since 2.0.0
 */
export interface ArraySchemable<U extends Kind> extends Hold<U> {
  readonly array: <A, B, C, D, E>(
    item: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [ReadonlyArray<A>, B, C], [D], [E]>;
}

/**
 * Takes a tuple of Schemables and returns a Schemable
 * for a tuple that matches, index for index, the input
 * schemables.
 *
 * ie. [StringSchemable, NumberSchemable] becomes
 * Schemable<[string, number]>
 *
 * @since 2.0.0
 */
export interface TupleSchemable<U extends Kind> extends Hold<U> {
  // deno-lint-ignore no-explicit-any
  readonly tuple: <A extends any[], B, C, D, E>(
    ...items: { readonly [K in keyof A]: $<U, [A[K], B, C], [D], [E]> }
  ) => $<U, [{ [K in keyof A]: A[K] }, B, C], [D], [E]>;
}

/**
 * Takes a struct of Schemables and returns a Schemable
 * for a struct that matches, key for key, the input
 * schemables.
 *
 * ie. { str: StringSchemable, num: NumberSchemable } becomes
 * Schemable<{ str: string, num: number }>
 *
 * @since 2.0.0
 */
export interface StructSchemable<U extends Kind> extends Hold<U> {
  readonly struct: <A, B, C, D, E>(
    items: { readonly [K in keyof A]: $<U, [A[K], B, C], [D], [E]> },
  ) => $<U, [{ readonly [K in keyof A]: A[K] }, B, C], [D], [E]>;
}

/**
 * Takes a struct of Schemables and returns a Schemable
 * for a struct that matches, key for key, the input
 * schemables but the values can also be partial.
 *
 * ie. { str: StringSchemable, num: NumberSchemable } becomes
 * Schemable<{ str?: string, num?: number }>
 *
 * @since 2.0.0
 */
export interface PartialSchemable<U extends Kind> extends Hold<U> {
  readonly partial: <A, B, C, D, E>(
    items: { readonly [K in keyof A]: $<U, [A[K], B, C], [D], [E]> },
  ) => $<U, [{ readonly [K in keyof A]?: A[K] }, B, C], [D], [E]>;
}

/**
 * Takes two schemables, left and right, and returns
 * the intersection of them. This means that any value
 * for must match both schemables.
 *
 * @since 2.0.0
 */
export interface IntersectSchemable<U extends Kind> extends Hold<U> {
  readonly intersect: <I, B, C, D, E>(
    right: $<U, [I, B, C], [D], [E]>,
  ) => <A>(
    left: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [Spread<A & I>, B, C], [D], [E]>;
}

/**
 * Takes two schemables, left and right, and returns
 * the union of them. This means that any value
 * for must match either schemable.
 *
 * @since 2.0.0
 */
export interface UnionSchemable<U extends Kind> extends Hold<U> {
  readonly union: <I, B, C, D, E>(
    right: $<U, [I, B, C], [D], [E]>,
  ) => <A>(left: $<U, [A, B, C], [D], [E]>) => $<U, [A | I, B, C], [D], [E]>;
}

/**
 * Takes an id and a thunk returning a schemable and
 * returns a schemable that matches the return value
 * of the thunk. This schemable is necessary for
 * handling recursive or corecursive schemables.
 *
 * @since 2.0.0
 */
export interface LazySchemable<U extends Kind> extends Hold<U> {
  readonly lazy: <A, B, C, D, E>(
    id: string,
    f: () => $<U, [A, B, C], [D], [E]>,
  ) => $<U, [A, B, C], [D], [E]>;
}

/**
 * A Schemable is the union of all schemable methods.
 * This allows one to build an arbitrary Schema using
 * the Schemable interface, then pass a concrete
 * Schemable implementation to the Schema. Thus, one
 * can build a single model and produce decoders,
 * guards, or jsonschema from that model.
 *
 * @since 2.0.0
 */
export interface Schemable<U extends Kind>
  extends
    UnknownSchemable<U>,
    StringSchemable<U>,
    NumberSchemable<U>,
    BooleanSchemable<U>,
    LiteralSchemable<U>,
    NullableSchemable<U>,
    UndefinableSchemable<U>,
    RecordSchemable<U>,
    ArraySchemable<U>,
    TupleSchemable<U>,
    StructSchemable<U>,
    PartialSchemable<U>,
    IntersectSchemable<U>,
    UnionSchemable<U>,
    LazySchemable<U>,
    Hold<U> {}

/**
 * A Schema is the a function that takes a generic schemable and builds
 * a specific model from it.
 *
 * @since 2.0.0
 */
export type Schema<A, B = unknown, C = unknown, D = unknown, E = unknown> = <
  U extends Kind,
>(S: Schemable<U>) => $<U, [A, B, C], [D], [E]>;

/**
 * Extracts the inner type of a Schema
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Schema<infer A> ? A : unknown;

// Helps inference in the schema function
type InferSchema<U extends Kind, A, B, C, D, E> = (
  S: Schemable<U>,
) => $<U, [A, B, C], [D], [E]>;

/**
 * A helper function to build a generic Schema that can be used
 * with any Schemable.
 *
 * @example
 * ```ts
 * import { schema, TypeOf } from "./schemable.ts";
 * import { SchemableDecoder } from "./decoder.ts";
 * import { SchemableRefinement } from "./refinement.ts";
 * import { SchemableJsonBuilder, print } from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * const mySchema = schema(s => pipe(
 *   s.struct({
 *     name: s.string(),
 *     age: s.number(),
 *   }),
 *   s.intersect(s.partial({
 *     interests: s.array(s.string()),
 *   }))
 * ));
 *
 * // Derive the type from the schema
 * type MySchema = TypeOf<typeof mySchema>;
 *
 * const decode = mySchema(SchemableDecoder);
 * const refine = mySchema(SchemableRefinement);
 * const jsonSchema = mySchema(SchemableJsonBuilder);
 *
 * const unknown1 = {
 *   name: "Batman",
 *   age: 45,
 *   interests: ["crime fighting", "cake", "bats"],
 * };
 * const unknown2 = {
 *   name: "Cthulhu",
 *   interests: ["madness"],
 * };
 *
 * const decoded1 = decode(unknown1); // Success!
 * const decoded2 = decode(unknown2); // Failure with info
 *
 * const refine1 = refine(unknown1); // true
 * const refine2 = refine(unknown2); // false
 *
 * const jsonSchemaString = pipe(
 *   jsonSchema,
 *   print,
 *   json => JSON.stringify(json, null, 2),
 * ); // Turns the jsonSchema into a prettified string
 *
 * ```
 *
 * @since 2.0.0
 */
export function schema<
  A,
  B = unknown,
  C = unknown,
  D = unknown,
  E = unknown,
  U extends Kind = Kind,
>(
  s: InferSchema<U, A, B, C, D, E>,
): Schema<A, B, C, D, E> {
  return memoize(s) as Schema<A>;
}
