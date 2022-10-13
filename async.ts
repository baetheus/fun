import type { Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";
import type { Sync } from "./sync.ts";

import {
  createApplySemigroup,
  createSequenceStruct,
  createSequenceTuple,
} from "./apply.ts";
import { resolve, wait } from "./promise.ts";
import { handleThrow } from "./fn.ts";

export type Async<A> = Sync<Promise<A>>;

export interface URI extends Kind {
  readonly kind: Async<Out<this, 0>>;
}

export function of<A>(a: A): Async<A> {
  return () => resolve(a);
}

export function delay(ms: number): <A>(ma: Async<A>) => Async<A> {
  return (ta) => () => wait(ms).then(ta);
}

export function fromSync<A>(fa: Sync<A>): Async<A> {
  return () => resolve(fa());
}

export function tryCatch<AS extends unknown[], A>(
  fasr: (...as: AS) => A | PromiseLike<A>,
  onThrow: (e: unknown, as: AS) => A,
): (...as: AS) => Async<A> {
  return (...as) => {
    const _onThrow = (e: unknown) => onThrow(e, as);
    return handleThrow(
      () => fasr(...as),
      (a) => resolve(a).catch(_onThrow),
      (e) => resolve(_onThrow(e)),
    );
  };
}

export function map<A, I>(fai: (a: A) => I): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then(fai);
}

export function apParallel<A, I>(
  tfai: Async<(a: A) => I>,
): (ta: Async<A>) => Async<I> {
  return (ta) => () => Promise.all([tfai(), ta()]).then(([fai, a]) => fai(a));
}

export function apSequential<A, I>(
  tfai: Async<(a: A) => I>,
): (ta: Async<A>) => Async<I> {
  return (ta) => async () => (await tfai())(await ta());
}

export function join<A>(tta: Async<Async<A>>): Async<A> {
  return () => tta().then((ta) => ta());
}

export function chain<A, I>(
  fati: (a: A) => Async<I>,
): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then((a) => fati(a)());
}

export const MonadAsyncParallel: Monad<URI> = {
  of,
  ap: apParallel,
  map,
  join,
  chain,
};

export const MonadAsyncSequential: Monad<URI> = {
  of,
  ap: apSequential,
  map,
  join,
  chain,
};

export const getApplySemigroupParallel = createApplySemigroup(
  MonadAsyncParallel,
);

export const getApplySemigroupSequential = createApplySemigroup(
  MonadAsyncSequential,
);

export const sequenceTupleParallel = createSequenceTuple(MonadAsyncParallel);

export const sequenceTupleSequential = createSequenceTuple(
  MonadAsyncSequential,
);

export const sequenceStructParallel = createSequenceStruct(MonadAsyncParallel);

export const sequenceStructSequential = createSequenceStruct(
  MonadAsyncSequential,
);
