import type { $, Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";
import type { Applicative } from "./applicative.ts";
import type { Traversable } from "./traversable.ts";

import { createSequenceStruct, createSequenceTuple } from "./apply.ts";
import { pipe } from "./fn.ts";

export interface URI extends Kind {
  readonly kind: Iterable<Out<this, 0>>;
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

export function reduce<A, O>(foao: (o: O, a: A) => O, o: O) {
  return (ua: Iterable<A>): O => {
    let out = o;
    for (const a of ua) {
      out = foao(o, a);
    }
    return out;
  };
}

export const MonadIterable: Monad<URI> = { of, ap, map, join, chain };

export const sequenceTuple = createSequenceTuple(MonadIterable);

export const sequenceStruct = createSequenceStruct(MonadIterable);
