import type { Kind, URIS } from "../hkt.ts";

import { memoize } from "../fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Literal = string | number | boolean | null;

/*******************************************************************************
 * Schemable Type Class
 ******************************************************************************/

export type UnknownSchemable<URI extends URIS> = {
  readonly unknown: () => Kind<URI, [unknown]>;
};

export type StringSchemable<URI extends URIS> = {
  readonly string: () => Kind<URI, [string]>;
};

export type NumberSchemable<URI extends URIS> = {
  readonly number: () => Kind<URI, [number]>;
};

export type BooleanSchemable<URI extends URIS> = {
  readonly boolean: () => Kind<URI, [boolean]>;
};

export type LiteralSchemable<URI extends URIS> = {
  readonly literal: <A extends [Literal, ...Literal[]]>(
    ...s: A
  ) => Kind<URI, [A[number]]>;
};

export type NullableSchemable<URI extends URIS> = {
  readonly nullable: <A>(or: Kind<URI, [A]>) => Kind<URI, [A | null]>;
};

export type UndefinableSchemable<URI extends URIS> = {
  readonly undefinable: <A>(or: Kind<URI, [A]>) => Kind<URI, [A | undefined]>;
};

export type RecordSchemable<URI extends URIS> = {
  readonly record: <A>(
    codomain: Kind<URI, [A]>,
  ) => Kind<URI, [Record<string, A>]>;
};

export type ArraySchemable<URI extends URIS> = {
  readonly array: <A>(item: Kind<URI, [A]>) => Kind<URI, [ReadonlyArray<A>]>;
};

export type TupleSchemable<URI extends URIS> = {
  // deno-lint-ignore no-explicit-any
  readonly tuple: <A extends any[]>(
    ...components: { [K in keyof A]: Kind<URI, [A[K]]> }
  ) => Kind<URI, [{ [K in keyof A]: A[K] }]>;
};

export type StructSchemable<URI extends URIS> = {
  readonly struct: <A>(
    properties: { [K in keyof A]: Kind<URI, [A[K]]> },
  ) => Kind<URI, [{ [K in keyof A]: A[K] }]>;
};

export type PartialSchemable<URI extends URIS> = {
  readonly partial: <A>(
    properties: { [K in keyof A]: Kind<URI, [A[K]]> },
  ) => Kind<URI, [{ [K in keyof A]?: A[K] | null }]>;
};

export type IntersectSchemable<URI extends URIS> = {
  readonly intersect: <I>(and: Kind<URI, [I]>) => <A>(
    ta: Kind<URI, [A]>,
  ) => Kind<URI, [A & I]>;
};

export type UnionSchemable<URI extends URIS> = {
  readonly union: <I>(
    or: Kind<URI, [I]>,
  ) => <A>(ta: Kind<URI, [A]>) => Kind<URI, [A | I]>;
};

export type LazySchemable<URI extends URIS> = {
  readonly lazy: <A>(id: string, f: () => Kind<URI, [A]>) => Kind<URI, [A]>;
};

export type Schemable<URI extends URIS> =
  & UnknownSchemable<URI>
  & StringSchemable<URI>
  & NumberSchemable<URI>
  & BooleanSchemable<URI>
  & LiteralSchemable<URI>
  & NullableSchemable<URI>
  & UndefinableSchemable<URI>
  & RecordSchemable<URI>
  & ArraySchemable<URI>
  & TupleSchemable<URI>
  & StructSchemable<URI>
  & PartialSchemable<URI>
  & IntersectSchemable<URI>
  & UnionSchemable<URI>
  & LazySchemable<URI>;

export type Schema<A> = <URI extends URIS>(s: Schemable<URI>) => Kind<URI, [A]>;

export type TypeOf<T> = T extends Schema<infer A> ? A : never;

/*******************************************************************************
 * Utilities
 ******************************************************************************/

export const make = <A>(
  f: (s: Schemable<URIS>) => Kind<URIS, [A]>,
  // deno-lint-ignore no-explicit-any
): Schema<A> => memoize(f) as any;
