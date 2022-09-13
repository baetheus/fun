import type * as T from "./types.ts";
import type * as S from "./schemable.ts";
import type { Kind } from "./kind.ts";
import type { State } from "./state.ts";

import * as M from "./state.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";
import { pipe } from "./fns.ts";

type NonEmptyArray<T> = readonly [T, ...T[]];

export type Unknown = Record<string, unknown>;

export type Boolean = { type: "boolean" };

export type Null = { type: "null" };

export type Enum = { enum: NonEmptyArray<S.Literal> };

export type AllOf = { allOf: NonEmptyArray<Type> };

export type AnyOf = { anyOf: NonEmptyArray<Type> };

export type OneOf = { oneOf: NonEmptyArray<Type> };

export type Ref = { $ref: string };

export type Definitions = Record<string, Type>;

export type String = {
  type: "string";
  enum?: NonEmptyArray<string>;
  minLength?: number;
  maxLength?: number;
};

export type Number =
  | { type: "integer"; enum?: NonEmptyArray<number> } // Integer
  | { type: "number"; enum?: NonEmptyArray<number> }; // Float

export type Object = {
  type: "object";
  properties: Record<string, Type>;
  required?: NonEmptyArray<string>;
  additionalProperties?: false | Type;
};

export type Array = {
  type: "array";
  items: Type | NonEmptyArray<Type>;
  additionalItems?: Type;
};

export type Type =
  & { definitions?: Definitions }
  & (
    | Unknown
    | String
    | Number
    | Object
    | Array
    | Boolean
    | Null
    | Enum
    | AllOf
    | AnyOf
    | OneOf
    | Ref
  );

export type JsonSchema<_> = State<Definitions, Type>;

export type TypeOf<T> = T extends JsonSchema<infer A> ? A : never;

export interface URI extends Kind {
  readonly type: JsonSchema<this[0]>;
}

const Apply = M.Applicative as unknown as T.Apply<URI>;

const sequenceTuple = createSequenceTuple(Apply);

const sequenceStruct = createSequenceStruct(Apply);

const { concat }: T.Semigroup<Definitions> = {
  concat: (a) => (b) => Object.assign({}, a, b),
};

const of = <A = never>(t: Type): JsonSchema<A> => M.of(t);

export function unknown(s: Definitions = {}): [Type, Definitions] {
  return [{}, s];
}

export function string(s: Definitions = {}): [Type, Definitions] {
  return [{ type: "string" }, s];
}

export function number(s: Definitions = {}): [Type, Definitions] {
  return [{ type: "number" }, s];
}

export function boolean(s: Definitions = {}): [Type, Definitions] {
  return [{ type: "boolean" }, s];
}

export function literal<A extends [S.Literal, ...S.Literal[]]>(
  ...literals: A
): JsonSchema<A[number]> {
  return of({ enum: literals });
}

export function nullable<A>(or: JsonSchema<A>): JsonSchema<A | null> {
  return pipe(
    sequenceTuple(or, of({ type: "null" })),
    M.map((anyOf) => ({ anyOf })),
  );
}

export function undefinable<A>(or: JsonSchema<A>): JsonSchema<A | undefined> {
  return pipe(
    sequenceTuple(or, of({})),
    M.map((anyOf) => ({ anyOf })),
  );
}

export function record<A>(
  codomain: JsonSchema<A>,
): JsonSchema<Record<string, A>> {
  return pipe(
    codomain,
    M.map((additionalProperties) => ({
      type: "object",
      properties: {},
      additionalProperties,
    })),
  );
}

export function array<A>(item: JsonSchema<A>): JsonSchema<ReadonlyArray<A>> {
  return pipe(item, M.map((items) => ({ type: "array", items })));
}

// deno-lint-ignore no-explicit-any
export function tuple<A extends any[]>(
  ...items: { [K in keyof A]: JsonSchema<A[K]> }
): JsonSchema<{ [K in keyof A]: A[K] }> {
  return pipe(
    M.sequenceArray(items),
    M.map((items) => ({ type: "array", items })),
  ) as JsonSchema<{ [K in keyof A]: A[K] }>;
}

export function struct<A>(
  items: { [K in keyof A]: JsonSchema<A[K]> },
): JsonSchema<{ [K in keyof A]: A[K] }> {
  return pipe(
    items as Record<string, JsonSchema<unknown>>,
    sequenceStruct,
    M.map((properties) => ({
      type: "object",
      properties,
      required: Object.keys(properties).sort(),
    })),
  ) as JsonSchema<{ [K in keyof A]: A[K] }>;
}

export function partial<A>(
  items: { [K in keyof A]: JsonSchema<A[K]> },
): JsonSchema<{ [K in keyof A]: A[K] }> {
  return pipe(
    items as Record<string, JsonSchema<unknown>>,
    sequenceStruct,
    M.map((properties) => ({ type: "object", properties })),
  ) as JsonSchema<{ [K in keyof A]: A[K] }>;
}

export function intersect<I>(
  and: JsonSchema<I>,
): <A>(ta: JsonSchema<A>) => JsonSchema<A & I> {
  return <A>(ta: JsonSchema<A>) =>
    pipe(
      sequenceTuple(ta, and),
      M.map((allOf) => ({ allOf })),
    );
}

export function union<I>(
  or: JsonSchema<I>,
): <A>(ta: JsonSchema<A>) => JsonSchema<A & I> {
  return <A>(ta: JsonSchema<A>) =>
    pipe(
      sequenceTuple(ta, or),
      M.map((anyOf) => ({ anyOf })),
    );
}

export function lazy<A>(id: string, fn: () => JsonSchema<A>): JsonSchema<A> {
  let returnRef = false;
  const ref: Ref = { $ref: `#/definitions/${id}` };
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

export function print<A>(jsonschema: JsonSchema<A>): Type {
  const [schema, definitions] = jsonschema({});
  return {
    ...schema,
    definitions,
  };
}

export const Schemable: S.Schemable<URI> = {
  unknown: () => unknown,
  string: () => string,
  number: () => number,
  boolean: () => boolean,
  literal,
  nullable,
  undefinable,
  record,
  array,
  tuple,
  struct,
  partial,
  intersect,
  union,
  lazy,
};
