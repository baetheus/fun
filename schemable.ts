/**
 * Schemable presents a unified algebra for parsing, decoding
 * guarding, or otherwise building typed js structures in
 * TypeScript.
 */

import type { $, Kind, TypeClass } from "./kind.ts";

import { memoize } from "./fns.ts";

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
export type UnknownSchemable<U extends Kind> = TypeClass<U> & {
  readonly unknown: () => $<U, [unknown]>;
};

/**
 * Wraps a string type in Schemable.
 *
 * @since 2.0.0
 */
export type StringSchemable<U extends Kind> = TypeClass<U> & {
  readonly string: () => $<U, [string]>;
};

/**
 * Wraps a number type in Schemable.
 *
 * @since 2.0.0
 */
export type NumberSchemable<U extends Kind> = TypeClass<U> & {
  readonly number: () => $<U, [number]>;
};

/**
 * Wraps a boolean type in Schemable.
 *
 * @since 2.0.0
 */
export type BooleanSchemable<U extends Kind> = TypeClass<U> & {
  readonly boolean: () => $<U, [boolean]>;
};

/**
 * Wraps a boolean type in Schemable.
 *
 * @since 2.0.0
 */
export type DateSchemable<U extends Kind> = TypeClass<U> & {
  readonly date: () => $<U, [Date]>;
};

/**
 * Wraps a union of literals in Schemable.
 *
 * @since 2.0.0
 */
export type LiteralSchemable<U extends Kind> = TypeClass<U> & {
  readonly literal: <A extends [Literal, ...Literal[]]>(
    ...s: A
  ) => $<U, [A[number]]>;
};

/**
 * Takes a Schemable<A> and returns a Schemable<A | null>;
 *
 * @since 2.0.0
 */
export type NullableSchemable<U extends Kind> = TypeClass<U> & {
  readonly nullable: <A>(or: $<U, [A]>) => $<U, [A | null]>;
};

/**
 * Takes a Schemable<A> and returns a Schemable<A | undefined>;
 *
 * @since 2.0.0
 */
export type UndefinableSchemable<U extends Kind> = TypeClass<U> & {
  readonly undefinable: <A>(or: $<U, [A]>) => $<U, [A | undefined]>;
};

/**
 * Takes a Schemable<A> and returns a Schemable<ReadonlyRecord<A>>
 *
 * @since 2.0.0
 */
export type RecordSchemable<U extends Kind> = TypeClass<U> & {
  readonly record: <A>(
    codomain: $<U, [A]>,
  ) => $<U, [Readonly<Record<string, A>>]>;
};

/**
 * Takes a Schemable<A> and returns a Schemable<ReadonlyArray<A>>
 *
 * @since 2.0.0
 */
export type ArraySchemable<U extends Kind> = TypeClass<U> & {
  readonly array: <A>(item: $<U, [A]>) => $<U, [ReadonlyArray<A>]>;
};

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
export type TupleSchemable<U extends Kind> = TypeClass<U> & {
  // deno-lint-ignore no-explicit-any
  readonly tuple: <A extends any[]>(
    ...items: { [K in keyof A]: $<U, [A[K]]> }
  ) => $<U, [{ [K in keyof A]: A[K] }]>;
};

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
export type StructSchemable<U extends Kind> = TypeClass<U> & {
  readonly struct: <A>(
    items: { [K in keyof A]: $<U, [A[K]]> },
  ) => $<U, [{ [K in keyof A]: A[K] }]>;
};

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
export type PartialSchemable<U extends Kind> = TypeClass<U> & {
  readonly partial: <A>(
    items: { [K in keyof A]: $<U, [A[K]]> },
  ) => $<U, [{ [K in keyof A]?: A[K] | null }]>;
};

/**
 * Takes two schemables, left and right, and returns
 * the intersection of them. This means that any value
 * for must match both schemables.
 *
 * @since 2.0.0
 */
export type IntersectSchemable<U extends Kind> = TypeClass<U> & {
  readonly intersect: <I>(
    right: $<U, [I]>,
  ) => <A>(left: $<U, [A]>) => $<U, [A & I]>;
};

/**
 * Takes two schemables, left and right, and returns
 * the union of them. This means that any value
 * for must match either schemable.
 *
 * @since 2.0.0
 */
export type UnionSchemable<U extends Kind> = TypeClass<U> & {
  readonly union: <I>(
    right: $<U, [I]>,
  ) => <A>(left: $<U, [A]>) => $<U, [A | I]>;
};

/**
 * Takes an id and a thunk returning a schemable and
 * returns a schemable that matches the return value
 * of the thunk. This schemable is necessary for
 * handling recursive or corecursive schemables.
 *
 * @since 2.0.0
 */
export type LazySchemable<U extends Kind> = TypeClass<U> & {
  readonly lazy: <A>(id: string, f: () => $<U, [A]>) => $<U, [A]>;
};

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
export type Schemable<U extends Kind> =
  & TypeClass<U>
  & UnknownSchemable<U>
  & StringSchemable<U>
  & NumberSchemable<U>
  & BooleanSchemable<U>
  & DateSchemable<U>
  & LiteralSchemable<U>
  & NullableSchemable<U>
  & UndefinableSchemable<U>
  & RecordSchemable<U>
  & ArraySchemable<U>
  & TupleSchemable<U>
  & StructSchemable<U>
  & PartialSchemable<U>
  & IntersectSchemable<U>
  & UnionSchemable<U>
  & LazySchemable<U>;

/**
 * A Schema is the a function that takes a generic schemable and builds
 * a specific model from it.
 *
 * @since 2.0.0
 */
export type Schema<A> = <U extends Kind>(S: Schemable<U>) => $<U, [A]>;

/**
 * Extracts the inner type of a Schema
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Schema<infer A> ? A : never;

// Helps inference in the schema function
type InferSchema<U extends Kind, A> =
  & TypeClass<U>
  & ((S: Schemable<U>) => $<U, [A]>);

/**
 * A helper function to build a generic Schema that can be used
 * with any Schemable.
 *
 * @example
 * ```ts
 * import { schema, TypeOf } from "./schemable.ts";
 * import * as D from "./decoder.ts";
 * import * as G from "./guard.ts";
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fns.ts";
 *
 * const mySchema = schema(s => pipe(
 *   s.struct({
 *     name: s.string(),
 *     age: s.number(),
 *   }),
 *   s.intersect(s.partial({
 *     birthdate: s.date(),
 *     interests: s.array(s.string()),
 *   }))
 * ));
 *
 * // Derive the type from the schema
 * type MySchema = TypeOf<typeof mySchema>;
 *
 * const decode = mySchema(D.Schemable);
 * const guard = mySchema(G.Schemable);
 * const jsonSchema = mySchema(J.Schemable);
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
 * const guarded1 = guard(unknown1); // true
 * const guarded2 = guard(unknown2); // false
 *
 * const jsonSchemaString = pipe(
 *   jsonSchema,
 *   J.print,
 *   json => JSON.stringify(json, null, 2),
 * ); // Turns the jsonSchema into a prettified string
 *
 * ```
 *
 * @since 2.0.0
 */
export function schema<A, U extends Kind = Kind>(
  s: InferSchema<U, A>,
): Schema<A> {
  return memoize(s) as Schema<A>;
}
