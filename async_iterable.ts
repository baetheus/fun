import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";
import type { Predicate } from "./types.ts";

import { createDo } from "./derivations.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";
import { wait } from "./fns.ts";

export const URI = "AsyncIterable";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: AsyncIterable<_[0]>;
  }
}

const isAsyncIterator = <A>(
  o: (() => AsyncIterator<A>) | AsyncGenerator<A>,
): o is AsyncGenerator<A> => Object.hasOwn(o, Symbol.asyncIterator);

export function make<A>(
  fa: (() => AsyncIterator<A>) | AsyncGenerator<A>,
): AsyncIterable<A> {
  if (isAsyncIterator(fa)) {
    return fa;
  }
  return { [Symbol.asyncIterator]: fa };
}

export function fromIterable<A>(ta: Iterable<A>): AsyncIterable<A> {
  return make(async function* () {
    for (const a of ta) {
      yield a;
    }
  });
}

export function clone<A>(ta: AsyncIterable<A>): AsyncIterable<A> {
  const cache: Promise<IteratorResult<A>>[] = [];
  let iterator: AsyncIterator<A>;

  return make(async function* () {
    if (iterator === undefined) {
      iterator = ta[Symbol.asyncIterator]();
    }

    let index = 0;

    while (true) {
      if (index === cache.length) {
        cache.push(iterator.next());
      } else {
        const { value, done } = await cache[index++];
        if (done) {
          break;
        }
        yield value;
      }
    }
  });
}

export function of<A>(...a: A[]): AsyncIterable<A> {
  return make(async function* () {
    let index = -1;
    const length = a.length;
    while (++index < length) {
      yield a[index];
    }
  });
}

export function ap<A, I>(
  tfai: AsyncIterable<(a: A) => I>,
): (ta: AsyncIterable<A>) => AsyncIterable<I> {
  return (ta) =>
    make(async function* () {
      for await (const fai of tfai) {
        for await (const a of ta) {
          yield fai(a);
        }
      }
    });
}

export function map<A, I>(
  fai: (a: A) => I | PromiseLike<I>,
): (ta: AsyncIterable<A>) => AsyncIterable<I> {
  return (ta) =>
    make(async function* () {
      for await (const a of ta) {
        yield await fai(a);
      }
    });
}

export function join<A>(
  tta: AsyncIterable<AsyncIterable<A>>,
): AsyncIterable<A> {
  return make(async function* () {
    for await (const ta of tta) {
      for await (const a of ta) {
        yield a;
      }
    }
  });
}

export function chain<A, I>(
  fati: (a: A) => AsyncIterable<I>,
): (ta: AsyncIterable<A>) => AsyncIterable<I> {
  return (ta) =>
    make(async function* () {
      for await (const a of ta) {
        for await (const i of fati(a)) {
          yield i;
        }
      }
    });
}

export function forEach<A>(
  onValue: (a: A) => void | PromiseLike<void>,
  onDone: () => void | PromiseLike<void> = () => {},
): (ta: AsyncIterable<A>) => PromiseLike<void> {
  return async (ta) => {
    for await (const a of ta) {
      await onValue(a);
    }
    onDone();
  };
}

export function delay(
  ms: number,
): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return map((a) => wait(ms).then(() => a));
}

export function filter<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return (ta) =>
    make(async function* () {
      for await (const a of ta) {
        if (predicate(a)) {
          yield a;
        }
      }
    });
}

export function reduce<A, O>(
  foao: (o: O, a: A, i: number) => O,
  o: O,
): (ta: AsyncIterable<A>) => Promise<O> {
  return async (ta) => {
    let index = 0;
    let result = o;
    for await (const a of ta) {
      result = foao(result, a, index++);
    }
    return result;
  };
}

export function takeUntil<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return (ta) =>
    make(async function* () {
      for await (const a of ta) {
        if (predicate(a)) {
          return;
        }
        yield a;
      }
    });
}

export function takeWhile<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return takeUntil((a) => !predicate(a));
}

export function scan<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: AsyncIterable<A>) => AsyncIterable<O> {
  return (ta) =>
    make(async function* () {
      let result = o;
      for await (const a of ta) {
        result = foao(result, a);
        yield result;
      }
    });
}

export function tap<A>(
  fa: (a: A) => void,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return (ta) =>
    make(async function* () {
      for await (const a of ta) {
        fa(a);
        yield a;
      }
    });
}

export function repeat(
  n: number,
): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return <A>(ta: AsyncIterable<A>) =>
    make(async function* () {
      let index = n;
      while (index-- > 0) {
        for await (const a of ta) {
          yield a;
        }
      }
    });
}

export function take(n: number): <A>(ta: AsyncIterable<A>) => AsyncIterable<A> {
  return <A>(ta: AsyncIterable<A>) =>
    make(async function* () {
      let count = Math.floor(n);
      for await (const a of ta) {
        if (count-- <= 0) {
          return;
        }
        yield a;
      }
    });
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const Filterable: T.Filterable<URI> = { filter };

export const { Do, bind, bindTo } = createDo(Monad);

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);
