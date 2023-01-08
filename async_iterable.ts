import type { Filterable } from "./filterable.ts";
import type { Option } from "./option.ts";
import type { Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";
import type { Either } from "./either.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";

import { isLeft, isRight } from "./either.ts";
import { isSome } from "./option.ts";
import { wait } from "./promise.ts";

export interface KindAsyncIterable extends Kind {
  readonly kind: AsyncIterable<Out<this, 0>>;
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

export function ap<A>(
  ua: AsyncIterable<A>,
): <I>(ufai: AsyncIterable<(a: A) => I>) => AsyncIterable<I> {
  return (ufai) =>
    make(async function* () {
      for await (const fai of ufai) {
        for await (const a of ua) {
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

export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: AsyncIterable<A>) => AsyncIterable<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ua: AsyncIterable<A>) => AsyncIterable<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: AsyncIterable<A>) => AsyncIterable<A> {
  return (ta) =>
    make(async function* filter() {
      for await (const a of ta) {
        if (predicate(a)) {
          yield a;
        }
      }
    });
}

export function filterMap<A, I>(
  predicate: (a: A) => Option<I>,
): (ua: AsyncIterable<A>) => AsyncIterable<I> {
  return (ua) =>
    make(
      async function* filterMap() {
        for await (const a of ua) {
          const result = predicate(a);
          if (isSome(result)) {
            yield result.value;
          }
        }
      },
    );
}

export function partition<A, B extends A>(
  refinement: (a: A) => a is B,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<A>, AsyncIterable<B>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<A>, AsyncIterable<A>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<A>, AsyncIterable<A>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      make(async function* partitionFirst() {
        for await (const a of cloned) {
          if (predicate(a)) {
            yield a;
          }
        }
      }),
      make(async function* partitionFirst() {
        for await (const a of cloned) {
          if (!predicate(a)) {
            yield a;
          }
        }
      }),
    ];
  };
}

export function partitionMap<A, I, J>(
  predicate: (a: A) => Either<J, I>,
): (ua: AsyncIterable<A>) => Pair<AsyncIterable<I>, AsyncIterable<J>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      make(async function* partitionFirst() {
        for await (const a of cloned) {
          const result = predicate(a);
          if (isRight(result)) {
            yield result.right;
          }
        }
      }),
      make(async function* partitionSecond() {
        for await (const a of cloned) {
          const result = predicate(a);
          if (isLeft(result)) {
            yield result.left;
          }
        }
      }),
    ];
  };
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

export const MonadAsyncIterable: Monad<KindAsyncIterable> = {
  of,
  ap,
  map,
  join,
  chain,
};

export const FilterableAsyncIterable: Filterable<KindAsyncIterable> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};
