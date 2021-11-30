import type { Kind, URIS } from "./kind.ts";

import { memoize } from "./fns.ts";

export type Literal = string | number | boolean | null;

export type UnknownSchemable<URI extends URIS> = {
  readonly unknown: <B = never, C = never, D = never>() => Kind<
    URI,
    [unknown, B, C, D]
  >;
};

export type StringSchemable<URI extends URIS> = {
  readonly string: <B = never, C = never, D = never>() => Kind<
    URI,
    [string, B, C, D]
  >;
};

export type NumberSchemable<URI extends URIS> = {
  readonly number: <B = never, C = never, D = never>() => Kind<
    URI,
    [number, B, C, D]
  >;
};

export type BooleanSchemable<URI extends URIS> = {
  readonly boolean: <B = never, C = never, D = never>() => Kind<
    URI,
    [boolean, B, C, D]
  >;
};

export type LiteralSchemable<URI extends URIS> = {
  readonly literal: <
    A extends [Literal, ...Literal[]],
    B = never,
    C = never,
    D = never,
  >(
    ...s: A
  ) => Kind<URI, [A[number], B, C, D]>;
};

export type NullableSchemable<URI extends URIS> = {
  readonly nullable: <A, B = never, C = never, D = never>(
    or: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A | null, B, C, D]>;
};

export type UndefinableSchemable<URI extends URIS> = {
  readonly undefinable: <A, B = never, C = never, D = never>(
    or: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A | undefined, B, C, D]>;
};

export type RecordSchemable<URI extends URIS> = {
  readonly record: <A, B = never, C = never, D = never>(
    codomain: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [Record<string, A>, B, C, D]>;
};

export type ArraySchemable<URI extends URIS> = {
  readonly array: <A, B = never, C = never, D = never>(
    item: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [ReadonlyArray<A>, B, C, D]>;
};

export type TupleSchemable<URI extends URIS> = {
  // deno-lint-ignore no-explicit-any
  readonly tuple: <A extends any[], B = never, C = never, D = never>(
    ...items: { [K in keyof A]: Kind<URI, [A[K], B, C, D]> }
  ) => Kind<URI, [{ [K in keyof A]: A[K] }, B, C, D]>;
};

export type StructSchemable<URI extends URIS> = {
  readonly struct: <A, B = never, C = never, D = never>(
    items: { [K in keyof A]: Kind<URI, [A[K], B, C, D]> },
  ) => Kind<URI, [{ [K in keyof A]: A[K] }, B, C, D]>;
};

export type PartialSchemable<URI extends URIS> = {
  readonly partial: <A, B = never, C = never, D = never>(
    items: { [K in keyof A]: Kind<URI, [A[K], B, C, D]> },
  ) => Kind<URI, [{ [K in keyof A]?: A[K] | null }, B, C, D]>;
};

export type IntersectSchemable<URI extends URIS> = {
  readonly intersect: <I, B = never, C = never, D = never>(
    and: Kind<URI, [I, B, C, D]>,
  ) => <A>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A & I, B, C, D]>;
};

export type UnionSchemable<URI extends URIS> = {
  readonly union: <I, B = never, C = never, D = never>(
    or: Kind<URI, [I, B, C, D]>,
  ) => <A>(ta: Kind<URI, [A, B, C, D]>) => Kind<URI, [A | I, B, C, D]>;
};

export type LazySchemable<URI extends URIS> = {
  readonly lazy: <A, B = never, C = never, D = never>(
    id: string,
    f: () => Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
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

export type Schema<A, B = never, C = never, D = never> = <URI extends URIS>(
  s: Schemable<URI>,
) => Kind<URI, [A, B, C, D]>;

export type TypeOf<T> = T extends Schema<infer A> ? A : never;

export function schema<A, B = never, C = never, D = never>(
  f: (s: Schemable<URIS>) => Kind<URIS, [A, B, C, D]>,
): Schema<A, B, C, D> {
  // deno-lint-ignore no-explicit-any
  return memoize(f) as any;
}
