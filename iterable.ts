import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import { createSequenceStruct, createSequenceTuple } from "./apply.ts";

export const URI = "Iterable";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Iterable<_[0]>;
  }
}

const isIterator = <A>(
  o: (() => Iterator<A>) | Generator<A>,
): o is Generator<A> => Object.hasOwn(o, Symbol.iterator);

export function make<A>(
  fa: (() => Iterator<A>) | Generator<A>,
): Iterable<A> {
  if (isIterator(fa)) {
    return fa;
  }
  return { [Symbol.iterator]: fa };
}

export function range(
  count: number,
  start = 0,
  step = 1,
): Iterable<number> {
  return make(function* () {
    let index = Math.floor(count);
    let value = start;
    while (index > 0) {
      yield value;
      index--;
      value += step;
    }
  });
}

export function of<A>(...a: A[]): Iterable<A> {
  return make(function* () {
    let index = -1;
    const length = a.length;
    while (++index < length) {
      yield a[index];
    }
  });
}

export function ap<A, I>(
  tfai: Iterable<(a: A) => I>,
): (ta: Iterable<A>) => Iterable<I> {
  return (ta) =>
    make(function* () {
      for (const fai of tfai) {
        for (const a of ta) {
          yield fai(a);
        }
      }
    });
}

export function map<A, I>(fai: (a: A) => I): (ta: Iterable<A>) => Iterable<I> {
  return (ta) =>
    make(function* () {
      for (const a of ta) {
        yield fai(a);
      }
    });
}

export function join<A>(tta: Iterable<Iterable<A>>): Iterable<A> {
  return make(function* () {
    for (const ta of tta) {
      for (const a of ta) {
        yield a;
      }
    }
  });
}

export function chain<A, I>(
  fati: (a: A) => Iterable<I>,
): (ta: Iterable<A>) => Iterable<I> {
  return (ta) =>
    make(function* () {
      for (const a of ta) {
        for (const i of fati(a)) {
          yield i;
        }
      }
    });
}

export function forEach<A>(fa: (a: A) => void): (ta: Iterable<A>) => void {
  return (ta) => {
    for (const a of ta) {
      fa(a);
    }
  };
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);
