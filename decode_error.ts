import type { Semigroup } from "./semigroup.ts";
import type { Forest } from "./tree.ts";

import * as TR from "./tree.ts";
import * as A from "./array.ts";
import * as O from "./option.ts";
import { pipe } from "./fn.ts";

export const required = "required" as const;

export const optional = "optional" as const;

export type Property = typeof required | typeof optional;

export type Leaf = {
  readonly tag: "Leaf";
  readonly value: unknown;
  readonly reason: string;
};

export type Wrap = {
  readonly tag: "Wrap";
  readonly context: string;
  readonly error: DecodeError;
};

export type Key = {
  readonly tag: "Key";
  readonly key: string;
  readonly property: Property;
  readonly error: DecodeError;
};

export type Index = {
  readonly tag: "Index";
  readonly index: number;
  readonly property: Property;
  readonly error: DecodeError;
};

export type Union = {
  readonly tag: "Union";
  readonly errors: readonly [DecodeError, DecodeError, ...DecodeError[]];
};

export type Intersection = {
  readonly tag: "Intersection";
  readonly errors: readonly [DecodeError, DecodeError, ...DecodeError[]];
};

export type Many = {
  readonly tag: "Many";
  readonly errors: readonly DecodeError[];
};

export type DecodeError =
  | Leaf
  | Wrap
  | Key
  | Index
  | Union
  | Intersection
  | Many;

export function isLeaf(err: DecodeError): err is Leaf {
  return err.tag === "Leaf";
}

export function isWrap(err: DecodeError): err is Wrap {
  return err.tag === "Wrap";
}

export function isKey(err: DecodeError): err is Key {
  return err.tag === "Key";
}

export function isIndex(err: DecodeError): err is Index {
  return err.tag === "Index";
}

export function isUnion(err: DecodeError): err is Union {
  return err.tag === "Union";
}

export function isIntersection(err: DecodeError): err is Intersection {
  return err.tag === "Intersection";
}

export function isMany(err: DecodeError): err is Many {
  return err.tag === "Many";
}

export function leaf(value: unknown, reason: string): DecodeError {
  return { tag: "Leaf", value, reason };
}

export function wrap(context: string, error: DecodeError): DecodeError {
  return { tag: "Wrap", context, error };
}

export function key(
  key: string,
  error: DecodeError,
  property: Property = optional,
): DecodeError {
  return { tag: "Key", key, property, error };
}

export function index(
  index: number,
  error: DecodeError,
  property: Property = optional,
): DecodeError {
  return { tag: "Index", index, property, error };
}

export function union(
  ...errors: readonly [DecodeError, DecodeError, ...DecodeError[]]
): DecodeError {
  const _errors = pipe(
    errors,
    A.chain((err) => isUnion(err) ? err.errors : [err]),
  ) as unknown as typeof errors;
  return { tag: "Union", errors: _errors };
}

export function intersection(
  ...errors: readonly [DecodeError, DecodeError, ...DecodeError[]]
): DecodeError {
  const _errors = pipe(
    errors,
    A.chain((err) => isIntersection(err) ? err.errors : [err]),
  ) as unknown as typeof errors;
  return { tag: "Intersection", errors: _errors };
}

export function many(
  ...errors: readonly [DecodeError, DecodeError, ...DecodeError[]]
): DecodeError {
  const _errors = pipe(
    errors,
    A.chain((err) => isMany(err) ? err.errors : [err]),
  );
  return { tag: "Many", errors: _errors };
}

export function match<O>(
  Leaf: (value: unknown, reason: string) => O,
  Wrap: (error: string, errors: DecodeError) => O,
  Key: (key: string, property: Property, errors: DecodeError) => O,
  Index: (index: number, property: Property, errors: DecodeError) => O,
  Union: (errors: readonly [DecodeError, ...DecodeError[]]) => O,
  Intersection: (errors: readonly [DecodeError, ...DecodeError[]]) => O,
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

const stringify = O.tryCatch(JSON.stringify);

function toForest(err: DecodeError): Forest<string> {
  return pipe(
    err,
    match(
      (value, reason) =>
        pipe(
          stringify(value),
          O.map((str) => `cannot decode ${str}, should be ${reason}`),
          O.getOrElse(() => `cannot decode or render, should be ${reason}`),
          TR.of,
          A.of,
        ),
      (context, error) => [TR.of(context, toForest(error))],
      (
        key,
        property,
        error,
      ) => [TR.of(`${property} property "${key}"`, toForest(error))],
      (
        index,
        property,
        error,
      ) => [TR.of(`${property} index ${index}`, toForest(error))],
      (
        errors,
      ) => [
        TR.of(`cannot decode union (any of)`, pipe(errors, A.chain(toForest))),
      ],
      (
        errors,
      ) => [
        TR.of(
          `cannot decode intersection (all of)`,
          pipe(errors, A.chain(toForest)),
        ),
      ],
      A.chain(toForest),
    ),
  );
}

export function draw(err: DecodeError): string {
  return pipe(
    toForest(err),
    A.map(TR.drawTree),
    (results) => results.join("\n"),
  );
}

// Union Semigroup
export const SemigroupDecodeError: Semigroup<DecodeError> = {
  concat: (right) => (left) =>
    isIntersection(left) && isIntersection(right)
      ? intersection(left, right)
      : many(left, right),
};
