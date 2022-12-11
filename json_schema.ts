/**
 * JsonSchema contains a set of combinators to build a subset
 * of [JSON Schema](https://json-schema.org/) in typescript.
 * It also includes an instance of Schemable that is useful
 * for describing a Schema to an external system.
 */

import type * as S from "./schemable.ts";
import type { Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";
import type { NonEmptyArray } from "./array.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Semigroup } from "./semigroup.ts";
import type { State } from "./state.ts";

import { MonadState } from "./state.ts";
import { sequence as sequenceA } from "./array.ts";
import { sequence as sequenceR } from "./record.ts";
import { pipe } from "./fn.ts";

// --
// JSON Schema Types
// ---

/**
 * Represents an unknown JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaUnknown = ReadonlyRecord<unknown>;

/**
 * Represents boolean in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaBoolean = { readonly type: "boolean" };

/**
 * Represents null in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaNull = { readonly type: "null" };

/**
 * Represents null in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaEnum = { readonly enum: NonEmptyArray<S.Literal> };

/**
 * Represents an intersection of Schemas in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaAllOf = { readonly allOf: NonEmptyArray<JsonSchema> };

/**
 * Represents a union of Schemas in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaAnyOf = { readonly anyOf: NonEmptyArray<JsonSchema> };

/**
 * Represents an exclusive union of Schemas in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaOneOf = { readonly oneOf: NonEmptyArray<JsonSchema> };

/**
 * Represents a reference to another Schema in JSON Schema, generally
 * useful for recursion or brevity.
 *
 * @since 2.0.0
 */
export type JsonSchemaRef = { readonly $ref: string };

/**
 * Represents string in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaString = {
  readonly type: "string";
  readonly enum?: NonEmptyArray<string>;
  readonly minLength?: number;
  readonly maxLength?: number;
};

/**
 * Represents number(float or integer) in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaNumber =
  | { readonly type: "integer"; readonly enum?: NonEmptyArray<number> } // Integer
  | { readonly type: "number"; readonly enum?: NonEmptyArray<number> }; // Float

/**
 * Represents string Date in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaDate = {
  readonly type: "string";
  readonly format: "date";
};

/**
 * Represents a struct in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaObject = {
  readonly type: "object";
  readonly properties: Record<string, JsonSchema>;
  readonly required?: NonEmptyArray<string>;
  readonly additionalProperties?: false | JsonSchema;
};

/**
 * Represents an array or tuple in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaArray = {
  readonly type: "array";
  readonly items: JsonSchema | NonEmptyArray<JsonSchema>;
  readonly additionalItems?: JsonSchema;
};

/**
 * Represents a collection of Schemas that can be
 * referenced by a $ref in JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchemaDefinitions = ReadonlyRecord<JsonSchema>;

/**
 * Represents a recursive JSON Schema
 *
 * @since 2.0.0
 */
export type JsonSchema =
  & { definitions?: JsonSchemaDefinitions }
  & (
    | JsonSchemaUnknown
    | JsonSchemaString
    | JsonSchemaNumber
    | JsonSchemaDate
    | JsonSchemaObject
    | JsonSchemaArray
    | JsonSchemaBoolean
    | JsonSchemaNull
    | JsonSchemaEnum
    | JsonSchemaAllOf
    | JsonSchemaAnyOf
    | JsonSchemaOneOf
    | JsonSchemaRef
  );

// ---
// JsonBuilder builds JsonSchema
// ---

/**
 * JsonBuilder is a wrapper over State, used to construct a JsonSchema
 * combinator by combinator. In this way it can also be used as
 * a Schemable to create a JsonSchema that matches a Decoder.
 *
 * Currently, the JsonSchema only supports a subset of the full
 * JSON Schema. There are no refinements or formats aside from
 * the basic types and Date.
 *
 * @since 2.0.0
 */
export type JsonBuilder<_> = State<JsonSchemaDefinitions, JsonSchema>;

/**
 * Given a JsonBuilder<T> this type will extract T for use in
 * type level programming.
 */
export type TypeOf<T> = T extends JsonBuilder<infer A> ? A : never;

/**
 * The Kind substitution scheme for JsonBuilder.
 */
export interface URI extends Kind {
  readonly kind: JsonBuilder<Out<this, 0>>;
}

// Concat JsonSchemaDefinitions
const { concat }: Semigroup<JsonSchemaDefinitions> = {
  concat: (a) => (b) => Object.assign({}, a, b),
};

export const MonadJsonBuilder = MonadState as Monad<URI>;

export const sequenceArray = sequenceA(MonadJsonBuilder);

export const sequenceRecord = sequenceR(MonadJsonBuilder);

export const of = MonadJsonBuilder.of;

export const ap = MonadJsonBuilder.ap;

export const map = MonadJsonBuilder.map;

export const join = MonadJsonBuilder.join;

export const chain = MonadJsonBuilder.chain;

/**
 * Creates a JsonBuilder of an unknown type
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * const schema = J.print(J.unknown()); // schema === {}
 * ```
 *
 * @since 2.0.0
 */
export function unknown(): JsonBuilder<unknown> {
  return of({});
}

/**
 * Creates a JsonBuilder of an string type
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { type: "string" }
 * const schema = J.print(J.string());
 * ```
 *
 * @since 2.0.0
 */
export function string(): JsonBuilder<string> {
  return of({ type: "string" });
}

/**
 * Creates a JsonBuilder of an number type
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { type: "number" }
 * const schema = J.print(J.number());
 * ```
 *
 * @since 2.0.0
 */
export function number(): JsonBuilder<number> {
  return of({ type: "number" });
}

/**
 * Creates a JsonBuilder of an boolean type
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { type: "boolean" }
 * const schema = J.print(J.boolean());
 * ```
 *
 * @since 2.0.0
 */
export function boolean(): JsonBuilder<boolean> {
  return of({ type: "boolean" });
}

/**
 * Creates a JsonBuilder of an date type
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { type: "string", format: "date" }
 * const schema = J.print(J.date());
 * ```
 *
 * @since 2.0.0
 */
export function date(): JsonBuilder<Date> {
  return of({ type: "string", format: "date" });
}

/**
 * Creates a JsonBuilder over a tuple of literals
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { enum: [1, 2, "hello"] }
 * const schema = J.print(J.literal(1, 2, "hello"));
 * ```
 *
 * @since 2.0.0
 */
export function literal<A extends [S.Literal, ...S.Literal[]]>(
  ...literals: A
): JsonBuilder<A[number]> {
  // deno-lint-ignore ban-types
  const _literals = literals.map((l): Exclude<S.Literal | {}, undefined> =>
    l === undefined ? {} : l
  );
  return of({ enum: _literals });
}

/**
 * Creates a JsonBuilder that makes the given builder
 * nullable
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { anyOf: [ { enum: [ 1 ] }, { type: "null" } ] }
 * const schema = J.print(J.nullable(J.literal(1)));
 * ```
 *
 * @since 2.0.0
 */
export function nullable<A>(or: JsonBuilder<A>): JsonBuilder<A | null> {
  return pipe(
    or,
    map((or) => ({ anyOf: [or, { type: "null" }] })),
  );
}

/**
 * Creates a JsonBuilder that makes the given builder
 * undefinable
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { anyOf: [ { enum: [ 1 ] }, {} ] }
 * const schema = J.print(J.undefinable(J.literal(1)));
 * ```
 *
 * @since 2.0.0
 */
export function undefinable<A>(or: JsonBuilder<A>): JsonBuilder<A | undefined> {
  return pipe(
    or,
    map((or) => ({ anyOf: [or, {}] })),
  );
}

/**
 * Creates a JsonBuilder of a Record with string keys and values
 * that match the supplied JsonBuilder
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { type: "object", properties: {}, additionalProperties: { type: "number" } }
 * const schema = J.print(J.record(J.number()));
 * ```
 *
 * @since 2.0.0
 */
export function record<A>(
  codomain: JsonBuilder<A>,
): JsonBuilder<Record<string, A>> {
  return pipe(
    codomain,
    map((additionalProperties) => ({
      type: "object",
      properties: {},
      additionalProperties,
    })),
  );
}

/**
 * Creates a JsonBuilder of an Array with values
 * that match the supplied JsonBuilder
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { type: "array", items: { type: "number" } }
 * const schema = J.print(J.array(J.number()));
 * ```
 *
 * @since 2.0.0
 */
export function array<A>(item: JsonBuilder<A>): JsonBuilder<ReadonlyArray<A>> {
  return pipe(item, map((items) => ({ type: "array", items })));
}

/**
 * Creates a JsonBuilder of a tuple with values
 * that match the supplied JsonBuilders
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // schema === { type: "array", items: [
 * //   { type: "number" },
 * //   { type: "string" }
 * // ] }
 * const schema = J.print(J.tuple(J.number(), J.string()));
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export function tuple<A extends any[]>(
  ...items: { [K in keyof A]: JsonBuilder<A[K]> }
): JsonBuilder<{ [K in keyof A]: A[K] }> {
  return pipe(
    sequenceArray(...items),
    map((items) => ({ type: "array", items })),
  ) as JsonBuilder<{ [K in keyof A]: A[K] }>;
}

/**
 * Creates a JsonBuilder of a struct with values
 * and keys that match the supplied JsonBuilders
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // {
 * //   type: "object",
 * //   properties: { num: { type: "number" }, str: { type: "string" } },
 * //   required: [ "num", "str" ]
 * // }
 * const schema = J.print(J.struct({
 *   num: J.number(),
 *   str: J.string()
 * }));
 * ```
 *
 * @since 2.0.0
 */
export function struct<A>(
  items: { [K in keyof A]: JsonBuilder<A[K]> },
): JsonBuilder<{ readonly [K in keyof A]: A[K] }> {
  return pipe(
    sequenceRecord(items as Record<string, JsonBuilder<unknown>>),
    map((properties) => ({
      type: "object",
      properties,
      required: Object.keys(properties).sort(),
    })),
  ) as JsonBuilder<{ [K in keyof A]: A[K] }>;
}

/**
 * Creates a JsonBuilder of a partial with values
 * and keys that match the supplied JsonBuilders
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // {
 * //   type: "object",
 * //   properties: { num: { type: "number" }, str: { type: "string" } },
 * // }
 * const schema = J.print(J.partial({
 *   num: J.number(),
 *   str: J.string()
 * }));
 * ```
 *
 * @since 2.0.0
 */
export function partial<A>(
  items: { readonly [K in keyof A]: JsonBuilder<A[K]> },
): JsonBuilder<{ [K in keyof A]?: A[K] }> {
  return pipe(
    sequenceRecord(items as Record<string, JsonBuilder<unknown>>),
    map((properties) => ({ type: "object", properties })),
  ) as JsonBuilder<{ [K in keyof A]: A[K] }>;
}

/**
 * Creates a JsonBuilder that intersects two JsonBuilders
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // {
 * //   "allOf": [
 * //     {
 * //       "type": "object",
 * //       "properties": {
 * //         "num": {
 * //           "type": "number"
 * //         }
 * //       },
 * //       "required": [
 * //         "num"
 * //       ]
 * //     },
 * //     {
 * //       "type": "object",
 * //       "properties": {
 * //         "str": {
 * //           "type": "string"
 * //         }
 * //       }
 * //     }
 * //   ]
 * // }
 *
 * const schema = pipe(
 *   J.struct({ num: J.number() }),
 *   J.intersect(J.partial({ str: J.string() })),
 *   J.print,
 * );
 * ```
 *
 * @since 2.0.0
 */
export function intersect<I>(
  and: JsonBuilder<I>,
): <A>(ta: JsonBuilder<A>) => JsonBuilder<A & I> {
  return <A>(ta: JsonBuilder<A>) =>
    pipe(
      sequenceArray(ta, and),
      map((allOf) => ({ allOf })),
    );
}

/**
 * Creates a JsonBuilder that unions two JsonBuilders
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // {
 * //   "anyOf": [
 * //     {
 * //       "type": "object",
 * //       "properties": {
 * //         "num": {
 * //           "type": "number"
 * //         }
 * //       },
 * //       "required": [
 * //         "num"
 * //       ]
 * //     },
 * //     {
 * //       "type": "object",
 * //       "properties": {
 * //         "str": {
 * //           "type": "string"
 * //         }
 * //       }
 * //     }
 * //   ]
 * // }
 *
 * const schema = pipe(
 *   J.struct({ num: J.number() }),
 *   J.union(J.partial({ str: J.string() })),
 *   J.print,
 * );
 * ```
 *
 * @since 2.0.0
 */
export function union<I>(
  or: JsonBuilder<I>,
): <A>(ta: JsonBuilder<A>) => JsonBuilder<A & I> {
  return <A>(ta: JsonBuilder<A>) =>
    pipe(
      sequenceArray(ta, or),
      map((anyOf) => ({ anyOf })),
    );
}

/**
 * Creates a lazy JsonBuilder, which is useful for creating
 * recursive JSON Schemas, mutual or otherwise. A limitation
 * of typescript means that the type must be defined outside
 * of the JsonBuilder and manually annotated
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import { pipe } from "./fn.ts";
 *
 * // {
 * //   "$ref": "#/definitions/Person",
 * //   "definitions": {
 * //     "Person": {
 * //       "type": "object",
 * //       "properties": {
 * //         "age": {
 * //           "type": "number"
 * //         },
 * //         "children": {
 * //           "type": "array",
 * //           "items": {
 * //             "$ref": "#/definitions/Person"
 * //           }
 * //         },
 * //         "name": {
 * //           "type": "string"
 * //         }
 * //       },
 * //       "required": [
 * //         "age",
 * //         "children",
 * //         "name"
 * //       ]
 * //     }
 * //   }
 * // }
 *
 * type Person = {
 *   readonly name: string;
 *   readonly age: number;
 *   readonly children: ReadonlyArray<Person>;
 * };
 *
 * const Person: J.JsonBuilder<Person> = J.lazy("Person", () =>
 *   J.struct({
 *     name: J.string(),
 *     age: J.number(),
 *     children: J.array(Person),
 *   }));
 *
 * const schema = J.print(Person);
 * ```
 *
 * @since 2.0.0
 */
export function lazy<A>(id: string, fn: () => JsonBuilder<A>): JsonBuilder<A> {
  let returnRef = false;
  const ref: JsonSchemaRef = { $ref: `#/definitions/${id}` };
  return (s) => {
    if (returnRef) {
      return [ref, s];
    }

    returnRef = true;
    const [schema, defs] = fn()(s);
    const definitions = pipe(
      { [id]: schema },
      concat(defs),
      concat(s),
    );
    return [ref, definitions];
  };
}

/**
 * Collapse a JsonBuilder<A> into a JsonSchema that can be logged
 * or used as output for a webserver or a file.
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 *
 * console.log(J.print(J.string())); // Logs { type: "string" }
 * ```
 *
 * @since 2.0.0
 */
export function print<A>(jsonschema: JsonBuilder<A>): JsonSchema {
  const [schema, definitions] = jsonschema({});
  return Object.keys(definitions).length > 0
    ? { ...schema, definitions }
    : schema;
}

/**
 * An instance of Schemable for use with a Schema.
 *
 * @example
 * ```ts
 * import * as J from "./json_schema.ts";
 * import * as S from "./schemable.ts";
 *
 * // Let's start with a recursive type structure
 * type Tree<A> = {
 *   readonly tag: 'Tree';
 *   readonly value: A;
 *   readonly forest: ReadonlyArray<Tree<A>>;
 * }
 *
 * // Next we can create a generic Schema (non-JSON) for Tree<string>
 * const TreeSchema: S.Schema<Tree<string>> = S.schema(s =>
 *   s.lazy("Tree<string>", () => s.struct({
 *     tag: s.literal("Tree"),
 *     value: s.string(),
 *     forest: s.array(TreeSchema(s)),
 *   }))
 * );
 *
 * // Then we can derive a JsonBuilder from the generic Schema
 * const TreeJsonBuilder = TreeSchema(J.SchemableJsonBuilder);
 *
 * // Lastly, we can pull an actual JSON Schema from the JsonBuilder
 * const TreeJsonSchema = J.print(TreeJsonBuilder);
 *
 * // {
 * //   "$ref": "#/definitions/Tree",
 * //   "definitions": {
 * //     "Tree": {
 * //       "type": "object",
 * //       "properties": {
 * //         "forest": {
 * //           "type": "array",
 * //           "items": {
 * //             "$ref": "#/definitions/Tree"
 * //           }
 * //         },
 * //         "tag": {
 * //           "enum": [
 * //             "Tree"
 * //           ]
 * //         },
 * //         "value": {
 * //           "type": "string"
 * //         }
 * //       },
 * //       "required": [
 * //         "forest",
 * //         "tag",
 * //         "value"
 * //       ]
 * //     }
 * //   }
 * // }
 * ```
 *
 * @since 2.0.0
 */
export const SchemableJsonBuilder: S.Schemable<URI> = {
  unknown,
  string,
  number,
  boolean,
  literal,
  nullable,
  undefinable,
  record,
  array,
  tuple: tuple as S.TupleSchemable<URI>["tuple"],
  struct,
  partial,
  intersect,
  union,
  lazy,
};
