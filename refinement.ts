import type { In, Kind, Out } from "./kind.ts";

import type { Option } from "./option.ts";
import type { Either } from "./either.ts";

import * as S from "./schemable.ts";
import { isNil } from "./nilable.ts";

export type Refinement<A, B extends A> = (a: A) => a is B;

export type TypeOf<T> = T extends Refinement<infer _, infer A> ? A : never;

export type InputOf<T> = T extends Refinement<infer B, infer _> ? B : never;

export interface URI extends Kind {
  readonly kind: Refinement<In<this, 0>, Out<this, 0>>;
}

export interface UnknownURI extends Kind {
  readonly kind: Refinement<unknown, Out<this, 0>>;
}

export function fromOption<A, B extends A>(
  faob: (a: A) => Option<B>,
): Refinement<A, B> {
  return (a: A): a is B => faob(a).tag === "Some";
}

export function fromEither<A, B extends A>(
  faob: (a: A) => Either<unknown, B>,
): Refinement<A, B> {
  return (a: A): a is B => faob(a).tag === "Right";
}

export function or<A, C extends A>(second: Refinement<A, C>) {
  return <B extends A>(first: Refinement<A, B>): Refinement<A, B | C> =>
  (a: A): a is B | C => first(a) || second(a);
}

export function and<A, C extends A>(second: Refinement<A, C>) {
  return <B extends A>(first: Refinement<A, B>): Refinement<A, B & C> =>
  (a: A): a is B & C => first(a) && second(a);
}

export function compose<A, B extends A, C extends B>(second: Refinement<B, C>) {
  return (first: Refinement<A, B>): Refinement<A, C> => (a: A): a is C =>
    first(a) && second(a);
}

export function unknown(_: unknown): _ is unknown {
  return true;
}

export function string(a: unknown): a is string {
  return typeof a === "string";
}

export function number(a: unknown): a is number {
  return typeof a === "number";
}

export function boolean(a: unknown): a is boolean {
  return typeof a === "boolean";
}

export function date(a: unknown): a is Date {
  try {
    // deno-lint-ignore no-explicit-any
    const _date = new Date(a as any);
    return !isNaN(_date.getTime());
  } catch {
    return false;
  }
}

export function isRecord(a: unknown): a is Record<string, unknown> {
  return typeof a === "object" && a !== null;
}

export function isArray(a: unknown): a is Array<unknown> {
  return Array.isArray(a);
}

export function isArrayN<N extends number>(
  n: N,
): Refinement<unknown, Array<unknown> & { length: N }> {
  return (a): a is Array<unknown> & { length: N } =>
    isArray(a) && a.length == n;
}

export function literal<A extends [S.Literal, ...S.Literal[]]>(
  ...literals: A
): Refinement<unknown, A[number]> {
  return (a): a is A[number] => literals.some((l) => l === a);
}

export function nullable<A, B extends A>(
  or: Refinement<A, B>,
): Refinement<A | null, B | null> {
  return (a): a is B | null => a === null || or(a);
}

export function undefinable<A, B extends A>(
  or: Refinement<A, B>,
): Refinement<A | undefined, B | undefined> {
  return (a): a is B | undefined => a === undefined || or(a);
}

export function record<A>(
  codomain: Refinement<unknown, A>,
): Refinement<unknown, Record<string, A>> {
  return (a): a is Record<string, A> =>
    isRecord(a) && Object.values(a).every(codomain);
}

export function array<A>(
  item: Refinement<unknown, A>,
): Refinement<unknown, Array<A>> {
  return (a): a is Array<A> => Array.isArray(a) && a.every(item);
}

// deno-lint-ignore no-explicit-any
export function tuple<A extends any[]>(
  ...items: { [K in keyof A]: Refinement<unknown, A[K]> }
): Refinement<unknown, { [K in keyof A]: A[K] }> {
  return (a): a is { [K in keyof A]: A[K] } =>
    Array.isArray(a) && items.length === a.length &&
    a.every((value, index) => items[index](value));
}

export function struct<A>(
  items: { [K in keyof A]: Refinement<unknown, A[K]> },
): Refinement<unknown, { [K in keyof A]: A[K] }> {
  return (a): a is { [K in keyof A]: A[K] } =>
    isRecord(a) &&
    Object.keys(items).every((key) => items[key as keyof typeof items](a[key]));
}

export function partial<A>(
  items: { [K in keyof A]: Refinement<unknown, A[K]> },
): Refinement<unknown, { [K in keyof A]?: A[K] | null }> {
  return (a): a is { [K in keyof A]?: A[K] | null } =>
    isRecord(a) &&
    Object.keys(items).every((key) =>
      isNil(a[key]) || items[key as keyof typeof items](a[key])
    );
}

export function intersect<B, I extends B>(
  gi: Refinement<B, I>,
): <A extends B>(ga: Refinement<B, A>) => Refinement<B, A & I> {
  return <A extends B>(ga: Refinement<B, A>) => (a): a is A & I =>
    ga(a) && gi(a);
}

export function union<B, I extends B>(
  gi: Refinement<B, I>,
): <A extends B>(ga: Refinement<B, A>) => Refinement<B, A | I> {
  return <A extends B>(ga: Refinement<B, A>) => (a): a is A | I =>
    ga(a) || gi(a);
}

export function lazy<A, B extends A>(
  _: string,
  fga: () => Refinement<A, B>,
): Refinement<A, B> {
  return fga();
}

export const Schemable: S.Schemable<UnknownURI> = {
  unknown: () => unknown,
  string: () => string,
  number: () => number,
  boolean: () => boolean,
  literal,
  nullable,
  undefinable,
  record,
  array,
  tuple: tuple as S.Schemable<URI>["tuple"],
  struct,
  partial,
  intersect,
  union,
  lazy,
};
