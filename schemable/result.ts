import type * as HKT from "../hkt.ts";
import type * as TC from "../type_classes.ts";

import {
  Either,
  getRightMonad,
  Left,
  left,
  mapLeft,
  Right,
  right,
} from "../either.ts";
import { drawTree, of as ofTree, Tree } from "../tree.ts";
import { pipe } from "../fns.ts";
import { Free, getFreeSemigroup } from "../semigroup.ts";
import { traverse as _traverseRecord } from "../record.ts";
import { traverse as _traverseArray } from "../array.ts";
import { createSequenceTuple } from "../sequence.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Kind = "required" | "optional";

export type Leaf<A> = {
  readonly tag: "Leaf";
  readonly actual: unknown;
  readonly error: A;
};

export type Key<A> = {
  readonly tag: "Key";
  readonly key: string;
  readonly kind: Kind;
  readonly errors: Free<DecodeError<A>>;
};

export type Index<A> = {
  readonly tag: "Index";
  readonly index: number;
  readonly kind: Kind;
  readonly errors: Free<DecodeError<A>>;
};

export type Member<A> = {
  readonly tag: "Member";
  readonly member: number;
  readonly errors: Free<DecodeError<A>>;
};

export type Lazy<A> = {
  readonly tag: "Lazy";
  readonly id: string;
  readonly errors: Free<DecodeError<A>>;
};

export type Wrap<A> = {
  readonly tag: "Wrap";
  readonly error: A;
  readonly errors: Free<DecodeError<A>>;
};

export type DecodeError<A> =
  | Leaf<A>
  | Key<A>
  | Index<A>
  | Member<A>
  | Lazy<A>
  | Wrap<A>;

export type DecodeErrors<A> = Free<DecodeError<A>>;

export type Failure = Left<DecodeErrors<string>>;

export type Success<A> = Right<A>;

export type Result<A> = Failure | Success<A>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Result";

export type URI = typeof URI;

declare module "../hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Result<_[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export function leaf<A>(actual: unknown, error: A): DecodeError<A> {
  return { tag: "Leaf", actual, error };
}

export function key<A>(
  key: string,
  errors: DecodeErrors<A>,
  kind: Kind = "optional",
): DecodeError<A> {
  return { tag: "Key", key, kind, errors };
}

export function index<A>(
  index: number,
  errors: DecodeErrors<A>,
  kind: Kind = "optional",
): DecodeError<A> {
  return { tag: "Index", index, kind, errors };
}

export function member<A>(
  member: number,
  errors: DecodeErrors<A>,
): DecodeError<A> {
  return { tag: "Member", member, errors };
}

export function lazy<A>(
  id: string,
  errors: DecodeErrors<A>,
): DecodeError<A> {
  return { tag: "Lazy", id, errors };
}

export function wrap<A>(error: A, errors: DecodeErrors<A>): DecodeError<A> {
  return { tag: "Wrap", error, errors };
}

export function ofLeaf(actual: unknown, error: string): DecodeErrors<string> {
  return Free.of(leaf(actual, error));
}

export function ofKey(
  _key: string,
  errors: DecodeErrors<string>,
  kind: Kind = "optional",
): DecodeErrors<string> {
  return Free.of(key(_key, errors, kind));
}

export function ofIndex(
  _index: number,
  errors: DecodeErrors<string>,
  kind: Kind = "optional",
): DecodeErrors<string> {
  return Free.of(index(_index, errors, kind));
}

export function ofWrap(
  error: string,
  errors: DecodeErrors<string>,
): DecodeErrors<string> {
  return Free.of(wrap(error, errors));
}

export function failure<A = never>(err: DecodeErrors<string>): Result<A> {
  return left(err);
}

export function success<A>(a: A): Result<A> {
  return right(a);
}

/*******************************************************************************
 * Destructors
 ******************************************************************************/

export function fold<A, O>(
  Leaf: (input: unknown, error: A) => O,
  Key: (key: string, kind: Kind, errors: DecodeErrors<A>) => O,
  Index: (index: number, kind: Kind, errors: DecodeErrors<A>) => O,
  Member: (member: number, errors: DecodeErrors<A>) => O,
  Lazy: (id: string, errors: DecodeErrors<A>) => O,
  Wrap: (error: A, errors: DecodeErrors<A>) => O,
): (e: DecodeError<A>) => O {
  return (e) => {
    switch (e.tag) {
      case "Leaf":
        return Leaf(e.actual, e.error);
      case "Key":
        return Key(e.key, e.kind, e.errors);
      case "Index":
        return Index(e.index, e.kind, e.errors);
      case "Member":
        return Member(e.member, e.errors);
      case "Lazy":
        return Lazy(e.id, e.errors);
      case "Wrap":
        return Wrap(e.error, e.errors);
    }
  };
}

/*******************************************************************************
 * Draw
 ******************************************************************************/

function toTree(e: DecodeError<string>): Tree<string> {
  return pipe(
    e,
    fold(
      (input, error) =>
        ofTree(`cannot decode ${JSON.stringify(input)}, should be ${error}`),
      (key, kind, errors) =>
        ofTree(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
      (index, kind, errors) =>
        ofTree(`${kind} index ${index}`, toForest(errors)),
      (member, errors) => ofTree(`member ${member}`, toForest(errors)),
      (id, errors) => ofTree(`lazy type ${id}`, toForest(errors)),
      (error, errors) => ofTree(error, toForest(errors)),
    ),
  );
}

function toForest(e: DecodeErrors<string>): ReadonlyArray<Tree<string>> {
  return pipe(
    e,
    Free.fold(
      (value) => [toTree(value)],
      (left, right) => toForest(left).concat(toForest(right)),
    ),
  );
}

export function draw(e: DecodeErrors<string>): string {
  return toForest(e).map(drawTree).join("\n");
}

export function extract<A>(ta: Result<A>): Either<string, A> {
  return pipe(
    ta,
    mapLeft(draw),
  );
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export function getSemigroup<A>(): TC.Semigroup<DecodeErrors<A>> {
  return getFreeSemigroup();
}

export const Semigroup = getSemigroup<string>();

const M = getRightMonad(Semigroup);

export const { concat } = Semigroup;

export const Apply: TC.Apply<URI> = { ap: M.ap, map: M.map };

export const Applicative: TC.Applicative<URI> = {
  of: M.of,
  ap: M.ap,
  map: M.map,
};

export const Monad: TC.Monad<URI> = {
  of: M.of,
  ap: M.ap,
  map: M.map,
  join: M.join,
  chain: M.chain,
};

export const { of, ap, map, join, chain } = Monad;

export const traverseRecord = _traverseRecord(Applicative);

export const traverseArray = _traverseArray(Applicative);

export const sequenceTuple = createSequenceTuple(Apply);
