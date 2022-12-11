// deno-lint-ignore-file no-explicit-any

/**
 * I think this is a stack safe implementation of Fn/Reader..
 *
 * I haven't really tested it though..
 *
 * The core idea here is to build up an array of "Controls"
 * that represent a few core operations over a LazyFn. To
 * keep things simple we only implement controls for id,
 * of(pure), contramap, map, and join(flatten). From these we can
 * implement ap, chain, and compose (concat two arrays of controls in
 * the right order).
 */

import type { Hold, In, Kind, Out } from "../kind.ts";
import type { Monad } from "../monad.ts";
import type { Category } from "../category.ts";

import { pipe } from "../fn.ts";
import * as A from "../array.ts";

type Id<A> = Hold<A> & {
  readonly tag: "Id";
};

const _id: Id<unknown> = { tag: "Id" };

type Of<A> = {
  readonly tag: "Of";
  readonly value: A;
};

function _of<A>(value: A): Of<A> {
  return { tag: "Of", value };
}

type Map<A, I> = {
  readonly tag: "Map";
  readonly value: (a: A) => I;
};

function _map<A, I>(value: (a: A) => I): Map<A, I> {
  return { tag: "Map", value };
}

type Contramap<L, D> = {
  readonly tag: "Contramap";
  readonly value: (l: L) => D;
};

function _contramap<L, D>(value: (l: L) => D): Contramap<L, D> {
  return { tag: "Contramap", value };
}

type Join = {
  readonly tag: "Join";
};

const _join: Join = { tag: "Join" };

type Control =
  | Id<any>
  | Of<any>
  | Map<any, any>
  | Contramap<any, any>
  | Join;

declare const LazyFnSymbol: unique symbol;

type LazyFnSymbol = typeof LazyFnSymbol;

export type LazyFn<D, A> =
  & Hold<[LazyFnSymbol, (d: D) => A]>
  & ReadonlyArray<Control>;

export interface KindLazyFn extends Kind {
  readonly kind: LazyFn<In<this, 0>, Out<this, 0>>;
}

export function id<A>(): LazyFn<A, A> {
  return [_id];
}

export function compose<A, I>(
  second: LazyFn<A, I>,
): <D>(first: LazyFn<D, A>) => LazyFn<D, I> {
  return (first) => [...first, ...second];
}

export function of<A, D = unknown>(value: A): LazyFn<D, A> {
  return [_of(value)];
}

export function map<A, I>(
  value: (a: A) => I,
): <D>(ua: LazyFn<D, A>) => LazyFn<D, I> {
  return (ua) => [...ua, _map(value)];
}

export function contramap<L, D>(
  value: (l: L) => D,
): <A>(ua: LazyFn<D, A>) => LazyFn<L, A> {
  return (ua) => [_contramap(value), ...ua];
}

export function join<D, A>(ua: LazyFn<D, LazyFn<D, A>>): LazyFn<D, A> {
  return [...ua, _join];
}

export function chain<D, A, I>(
  value: (a: A) => LazyFn<D, I>,
): (ua: LazyFn<D, A>) => LazyFn<D, I> {
  return (ua) => [...ua, _map(value), _join];
}

export function ap<D, A>(
  ua: LazyFn<D, A>,
): <I>(ufai: LazyFn<D, (a: A) => I>) => LazyFn<D, I> {
  return <I>(ufai: LazyFn<D, (a: A) => I>): LazyFn<D, I> =>
    pipe(
      ua,
      map((a) => pipe(ufai, map((fai) => fai(a)))),
      join,
    );
}

export function execute<D, A>(d: D): (ua: LazyFn<D, A>) => A {
  return (ua) => {
    // Start with a copy of the controls since we modify
    // this array as execution progresses.
    const controls = ua.slice();
    let initial = d;
    let result = d;
    let index = 0;

    // Loop through the controls one at a time
    while (index < controls.length) {
      const control = controls[index];
      switch (control.tag) {
        /**
         * The Id control means pass a result through
         * ie. a -> a. In this case we just advance the
         * index since result already contains the value.
         */
        case "Id": {
          index++;
          break;
        }
        /**
         * The Of control holds a pure reference to a value.
         * In this case we set our current result to the pure
         * value and advance the index.
         */
        case "Of": {
          result = control.value;
          index++;
          break;
        }
        /**
         * The Map control holds a unary function that maps
         * over the preceding value of the execution.
         *
         * Chain is implemented as map followed by join
         * Ap is implemented as nested mapping followed by a join
         */
        case "Map": {
          result = control.value(result);
          index++;
          break;
        }
        /**
         * The Contramap controls holds a unary function that operates
         * at the head of the control array. Since contramap changes
         * the "argument" of a LazyFn we need to keep track of this
         * change in order to properly align the result type when
         * an Join occurs. The contramapped function effectively
         * changes the execute value for any future Joins.
         */
        case "Contramap": {
          result = control.value(result);
          initial = result;
          index++;
          break;
        }
        /**
         * The Join control is always preceded by a control that
         * results in another array of controls. To handle this
         * case we modify the controls array, throwing away all
         * of the previous controls, including the current one,
         * and inserting the result controls in their place.
         * After this, the result is reset to the initial
         * exec value and the index is reset to 0.
         */
        case "Join": {
          controls.splice(0, index + 1, ...(result as Control[]));
          result = initial;
          index = 0;
          break;
        }
      }
    }
    return result as unknown as A;
  };
}

export const MonadLazyFn: Monad<KindLazyFn> = { of, ap, map, join, chain };

export const CategoryLazyFn: Category<KindLazyFn> = { id, compose };

export const sequenceTuple = A.sequence(MonadLazyFn);

type Person = { name: string };

const t1 = pipe(
  id<number>(),
  map((n) => n + 1),
  chain((n) => of(n - 1)),
  chain((n) =>
    pipe(
      id<string>(),
      map((m) => m.length + n),
      contramap((n: number) => String(n)),
    )
  ),
  map((n) => (str: string) => n + str.length),
  ap(of("Hello")),
  contramap((str: string) => str.length),
  contramap(({ name }: Person) => name),
);

pipe(t1, execute({ name: "Brandon" }), console.log);
