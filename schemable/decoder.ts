import type * as HKT from "../hkt.ts";
import type * as TC from "../type_classes.ts";
import type * as RE from "../reader_either.ts";

import * as E from "../either.ts";
import * as T from "../tree.ts";
import * as A from "../array.ts";
import * as R from "../record.ts";
import { Free } from "../semigroup.ts";
import { createSequenceTuple } from "../sequence.ts";
import {
  flow,
  intersect as _intersect,
  isRecord,
  memoize,
  pipe,
} from "../fns.ts";

import { DecodeError, fold, getSemigroup, make } from "./decode_error.ts";
import * as S from "./schemable.ts";
import * as G from "./guard.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Failure = Free<DecodeError<string>>;

export type Decoder<A> = RE.ReaderEither<unknown, Failure, A>;

export type Decoded<A> = E.Either<Failure, A>;

export type TypeOf<D> = D extends Decoder<infer A> ? A : never;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Decoder";

export type URI = typeof URI;

export const DecodedURI = "Decoded";

export type DecodedURI = typeof DecodedURI;

declare module "../hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Decoder<_[0]>;
    [DecodedURI]: Decoded<_[0]>;
  }
}

/*******************************************************************************
 * DecodeError
 ******************************************************************************/

const DecodeErrorSemigroup = getSemigroup<string>();

const { concat } = DecodeErrorSemigroup;

const _append = (actual: unknown, error: string) =>
  (e: Failure) =>
    pipe(make.member(1, e), concat(make.member(0, make.leaf(actual, error))));

export const success: <A>(a: A) => Decoded<A> = E.right;

export const failure = <A = never>(
  actual: unknown,
  message: string,
): Decoded<A> => E.left(make.leaf(actual, message));

/*******************************************************************************
 * Decoded
 ******************************************************************************/

const DecodedMonad = E.getRightMonad(DecodeErrorSemigroup);

const DecodedApply: TC.Apply<DecodedURI> = DecodedMonad;

const DecodedApplicative: TC.Applicative<DecodedURI> = DecodedMonad;

const traverseRecord = R.indexedTraverse(DecodedApplicative);

const traverseArray = A.indexedTraverse(DecodedApplicative);

const sequenceTuple = createSequenceTuple(DecodedApply);

/*******************************************************************************
* Constructors
*******************************************************************************/

export const fromGuard = <A>(
  guard: G.Guard<A>,
  expected: string,
): Decoder<A> => (i: unknown) => guard(i) ? success(i) : failure(i, expected);

/*******************************************************************************
* Utility
*******************************************************************************/

const literalString = (literal: S.Literal) =>
  typeof literal === "string" ? `"${literal}"` : `${literal}`;

const literalError = (literals: S.Literal[]): string => {
  const lits = literals.map(literalString);
  switch (lits.length) {
    case 0:
      return "void";
    case 1:
      return lits[0];
    case 2:
      return `${lits[0]} or ${lits[1]}`;
    default: {
      const last = lits.slice(-1);
      const init = lits.slice(0, lits.length - 1);
      return `literal ${init.join(", ")}, or ${last}`;
    }
  }
};

/*******************************************************************************
* Draw
*******************************************************************************/

const toTree: (e: DecodeError<string>) => T.Tree<string> = fold({
  Leaf: (input, error) =>
    T.make(`cannot decode ${JSON.stringify(input)}, should be ${error}`),
  Key: (key, kind, errors) =>
    T.make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) =>
    T.make(`${kind} index ${index}`, toForest(errors)),
  Lazy: (id, errors) => T.make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => T.make(error, toForest(errors)),
  Member: (index, errors) => T.make(`member ${index}`, toForest(errors)),
});

const toForest: (e: Failure) => ReadonlyArray<T.Tree<string>> = Free.fold(
  (value) => [toTree(value)],
  (left, right) => toForest(left).concat(toForest(right)),
);

export const draw = (e: Failure): string =>
  toForest(e).map(T.drawTree).join("\n");

export const extract = <A>(decoded: Decoded<A>) =>
  pipe(decoded, E.mapLeft(draw));

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const UnknownSchemable: S.UnknownSchemable<URI> = {
  unknown: () => fromGuard(G.unknown, "unknown"),
};

export const StringSchemable: S.StringSchemable<URI> = {
  string: () => fromGuard(G.string, "string"),
};

export const NumberSchemable: S.NumberSchemable<URI> = {
  number: () => fromGuard(G.number, "number"),
};

export const BooleanSchemable: S.BooleanSchemable<URI> = {
  boolean: () => fromGuard(G.boolean, "boolean"),
};

export const LiteralSchemable: S.LiteralSchemable<URI> = {
  literal: <A extends [S.Literal, ...S.Literal[]]>(...s: A) =>
    fromGuard(G.literal(...s), literalError(s)),
};

export const NullableSchemable: S.NullableSchemable<URI> = {
  nullable: <A>(or: Decoder<A>): Decoder<A | null> =>
    (u: unknown) =>
      u === null ? success(u) : pipe(
        or(u),
        E.mapLeft(_append(u, "null")),
        E.mapLeft((e) => make.wrap("cannot decode nullable", e)),
      ),
};

export const UndefinableSchemable: S.UndefinableSchemable<URI> = {
  undefinable: <A>(or: Decoder<A>): Decoder<A | undefined> =>
    (u: unknown) =>
      u === undefined ? success(u) : pipe(
        or(u),
        E.mapLeft(_append(u, "undefined")),
        E.mapLeft((e) => make.wrap("cannot decode undefinable", e)),
      ),
};

export const RecordSchemable: S.RecordSchemable<URI> = {
  record: <A>(codomain: Decoder<A>): Decoder<Record<string, A>> =>
    (u: unknown): Decoded<Readonly<Record<string, A>>> =>
      isRecord(u)
        ? pipe(
          u,
          traverseRecord((uu, i) =>
            pipe(codomain(uu), E.mapLeft((e) => make.key(i, "optional", e)))
          ),
          E.mapLeft((e) => make.wrap("cannot decode record", e)),
        )
        : failure(u, "record"),
};

export const ArraySchemable: S.ArraySchemable<URI> = {
  array: <A>(item: Decoder<A>): Decoder<ReadonlyArray<A>> =>
    (u) =>
      Array.isArray(u)
        ? pipe(
          u,
          traverseArray((uu, i) =>
            pipe(item(uu), E.mapLeft((e) => make.index(i, "optional", e)))
          ),
          E.mapLeft((e) => make.wrap("cannot decode array", e)),
        )
        : failure(u, "array"),
};

export const TupleSchemable: S.TupleSchemable<URI> = {
  tuple: (...components) =>
    // deno-lint-ignore no-explicit-any
    (u: unknown): any =>
      Array.isArray(u) && u.length === components.length
        ? pipe(
          u,
          traverseArray((uu, i) =>
            pipe(
              components[i](uu),
              E.mapLeft((e) => make.index(i, "required", e)),
            )
          ),
          E.mapLeft((e) => make.wrap("cannot decode tuple", e)),
        )
        : failure(u, `tuple of length ${components.length}`),
};

export const StructSchemable: S.StructSchemable<URI> = {
  struct: (properties) =>
    // deno-lint-ignore no-explicit-any
    (u): any => {
      if (isRecord(u)) {
        return pipe(
          properties,
          // deno-lint-ignore no-explicit-any
          traverseRecord((decoder: Decoder<any>, i) =>
            pipe(decoder(u[i]), E.mapLeft((e) => make.key(i, "required", e)))
          ),
          E.mapLeft((e) => make.wrap("cannot decode struct", e)),
        );
      }
      return failure(u, "struct");
    },
};

export const PartialSchemable: S.PartialSchemable<URI> = {
  partial: (properties) =>
    // deno-lint-ignore no-explicit-any
    (u: unknown): any =>
      isRecord(u)
        ? pipe(
          properties,
          // deno-lint-ignore no-explicit-any
          traverseRecord((decoder: Decoder<any>, i) =>
            pipe(
              u[i],
              UndefinableSchemable.undefinable(decoder),
              E.mapLeft((e) => make.key(i, "optional", e)),
            )
          ),
          E.mapLeft((e) => make.wrap("cannot decode partial", e)),
        )
        : failure(u, "struct"),
};

export const IntersectSchemable: S.IntersectSchemable<URI> = {
  intersect: <I>(and: Decoder<I>) =>
    <A>(ta: Decoder<A>): Decoder<I & A> =>
      (u: unknown): Decoded<I & A> =>
        pipe(
          sequenceTuple(ta(u), and(u)),
          E.map(([left, right]) => _intersect(left, right)),
        ),
};

export const UnionSchemable: S.UnionSchemable<URI> = {
  union: <I>(or: Decoder<I>) =>
    <A>(ta: Decoder<A>): Decoder<I | A> =>
      (u) =>
        pipe(
          ta(u),
          E.chainLeft((ea) =>
            pipe(
              or(u),
              E.mapLeft((ei) =>
                pipe(make.member(1, ei), concat(make.member(0, ea)))
              ),
            ) as Decoded<I | A>
          ),
        ),
};

export const LazySchemable: S.LazySchemable<URI> = {
  lazy: <A>(id: string, fn: () => Decoder<A>): Decoder<A> => {
    const get = memoize<void, Decoder<A>>(fn);
    return flow(
      get(),
      E.mapLeft((e) => make.lazy(id, e)),
    );
  },
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
