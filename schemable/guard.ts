import type * as HKT from "../hkt.ts";

import { isNil, isRecord } from "../fns.ts";

import * as S from "./schemable.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Guard<A> = (i: unknown) => i is A;

export type TypeOf<D> = D extends Guard<infer A> ? A : never;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Guard";

export type URI = typeof URI;

declare module "../hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Guard<_[0]>;
  }
}

/*******************************************************************************
 * Guard Schemables
 ******************************************************************************/

export const UnknownSchemable: S.UnknownSchemable<URI> = {
  unknown: () => (_: unknown): _ is unknown => true,
};

export const StringSchemable: S.StringSchemable<URI> = {
  string: () => (u: unknown): u is string => typeof u === "string",
};

export const NumberSchemable: S.NumberSchemable<URI> = {
  number: () => (u: unknown): u is number => typeof u === "number",
};

export const BooleanSchemable: S.BooleanSchemable<URI> = {
  boolean: () => (u: unknown): u is boolean => typeof u === "boolean",
};

export const LiteralSchemable: S.LiteralSchemable<URI> = {
  literal: <A extends [S.Literal, ...S.Literal[]]>(...s: A) =>
    (u: unknown): u is A[number] => s.some((l) => l === u),
};

export const NullableSchemable: S.NullableSchemable<URI> = {
  nullable: <A>(or: Guard<A>) =>
    (u: unknown): u is A | null => u === null || or(u),
};

export const UndefinableSchemable: S.UndefinableSchemable<URI> = {
  undefinable: <A>(or: Guard<A>) =>
    (u: unknown): u is A | undefined => u === undefined || or(u),
};

export const RecordSchemable: S.RecordSchemable<URI> = {
  record: <A>(codomain: Guard<A>) =>
    (u: unknown): u is Record<string, A> =>
      isRecord(u) && Object.values(u).every(codomain),
};

export const ArraySchemable: S.ArraySchemable<URI> = {
  array: <A>(item: Guard<A>) =>
    (u: unknown): u is ReadonlyArray<A> => Array.isArray(u) && u.every(item),
};

export const TupleSchemable: S.TupleSchemable<URI> = {
  // deno-lint-ignore no-explicit-any
  tuple: (<A extends any[]>(
    ...components: { [K in keyof A]: Guard<A[K]> }
  ): Guard<{ [K in keyof A]: A[K] }> =>
    (u: unknown): u is { [K in keyof A]: A[K] } =>
      (Array.isArray(u) && components.length === u.length) &&
      u.every((v, i) => components[i](v))) as S.TupleSchemable<URI>["tuple"],
};

export const StructSchemable: S.StructSchemable<URI> = {
  struct: <A>(
    properties: { [K in keyof A]: Guard<A[K]> },
  ): Guard<{ [K in keyof A]: A[K] }> =>
    (u: unknown): u is { [K in keyof A]: A[K] } => (isRecord(u) &&
      Object.keys(properties).every((key) =>
        properties[key as keyof typeof properties](u[key])
      )),
};

export const PartialSchemable: S.PartialSchemable<URI> = {
  partial: <A>(
    properties: { [K in keyof A]: Guard<A[K]> },
  ): Guard<{ [K in keyof A]?: A[K] | null }> =>
    // deno-lint-ignore no-explicit-any
    (u: unknown): u is any => (isRecord(u) &&
      Object.keys(properties).every((key) =>
        isNil(u[key]) || properties[key as keyof typeof properties](u[key])
      )),
};

export const IntersectSchemable: S.IntersectSchemable<URI> = {
  intersect: <I>(and: Guard<I>) =>
    <A>(ga: Guard<A>): Guard<A & I> =>
      (u: unknown): u is A & I => ga(u) && and(u),
};

export const UnionSchemable: S.UnionSchemable<URI> = {
  union: <I>(or: Guard<I>) =>
    <A>(ga: Guard<A>): Guard<A | I> =>
      (u: unknown): u is A | I => ga(u) || or(u),
};

export const LazySchemable: S.LazySchemable<URI> = {
  lazy: <A>(_: string, f: () => Guard<A>) => f(),
};

export const Schemable: S.Schemable<URI> = {
  ...UnknownSchemable,
  ...StringSchemable,
  ...NumberSchemable,
  ...BooleanSchemable,
  ...LiteralSchemable,
  ...NullableSchemable,
  ...UndefinableSchemable,
  ...RecordSchemable,
  ...ArraySchemable,
  ...TupleSchemable,
  ...StructSchemable,
  ...PartialSchemable,
  ...IntersectSchemable,
  ...UnionSchemable,
  ...LazySchemable,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const unknown = Schemable.unknown();

export const string = Schemable.string();

export const number = Schemable.number();

export const boolean = Schemable.boolean();

export const literal = Schemable.literal;

export const nullable = Schemable.nullable;

export const undefinable = Schemable.undefinable;

export const record = Schemable.record;

export const array = Schemable.array;

export const tuple = Schemable.tuple;

export const struct = Schemable.struct;

export const partial = Schemable.partial;

export const intersect = Schemable.intersect;

export const union = Schemable.union;

export const lazy = Schemable.lazy;
