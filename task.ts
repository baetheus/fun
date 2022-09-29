import type { Kind, Monad, Out } from "./types.ts";

import {
  createApplySemigroup,
  createSequenceStruct,
  createSequenceTuple,
} from "./apply.ts";
import { handleThrow, resolve, wait } from "./fns.ts";

export type Task<A> = () => Promise<A>;

export interface URI extends Kind {
  readonly kind: Task<Out<this, 0>>;
}

export function of<A>(a: A): Task<A> {
  return () => resolve(a);
}

export function delay(ms: number): <A>(ma: Task<A>) => Task<A> {
  return (ta) => () => wait(ms).then(ta);
}

export function fromThunk<A>(fa: () => A): Task<A> {
  return () => resolve(fa());
}

export function tryCatch<AS extends unknown[], A>(
  fasr: (...as: AS) => A | PromiseLike<A>,
  onThrow: (e: unknown, as: AS) => A,
): (...as: AS) => Task<A> {
  return (...as) => {
    const _onThrow = (e: unknown) => onThrow(e, as);
    return handleThrow(
      () => fasr(...as),
      (a) => resolve(a).catch(_onThrow),
      (e) => resolve(_onThrow(e)),
    );
  };
}

export function map<A, I>(fai: (a: A) => I): (ta: Task<A>) => Task<I> {
  return (ta) => () => ta().then(fai);
}

export function apParallel<A, I>(
  tfai: Task<(a: A) => I>,
): (ta: Task<A>) => Task<I> {
  return (ta) => () => Promise.all([tfai(), ta()]).then(([fai, a]) => fai(a));
}

export function apSequential<A, I>(
  tfai: Task<(a: A) => I>,
): (ta: Task<A>) => Task<I> {
  return (ta) => async () => (await tfai())(await ta());
}

export function join<A>(tta: Task<Task<A>>): Task<A> {
  return () => tta().then((ta) => ta());
}

export function chain<A, I>(fati: (a: A) => Task<I>): (ta: Task<A>) => Task<I> {
  return (ta) => () => ta().then((a) => fati(a)());
}

export const MonadTaskParallel: Monad<URI> = {
  of,
  ap: apParallel,
  map,
  join,
  chain,
};

export const MonadTaskSequential: Monad<URI> = {
  of,
  ap: apSequential,
  map,
  join,
  chain,
};

export const getApplySemigroupParallel = createApplySemigroup(
  MonadTaskParallel,
);

export const getApplySemigroupSequential = createApplySemigroup(
  MonadTaskSequential,
);

export const sequenceTupleParallel = createSequenceTuple(MonadTaskParallel);

export const sequenceTupleSequential = createSequenceTuple(MonadTaskSequential);

export const sequenceStructParallel = createSequenceStruct(MonadTaskParallel);

export const sequenceStructSequential = createSequenceStruct(
  MonadTaskSequential,
);
