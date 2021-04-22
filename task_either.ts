import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Lazy } from "./types.ts";

import * as E from "./either.ts";
import * as T from "./task.ts";
import { createDo } from "./derivations.ts";
import { constant, flow, identity, pipe, wait } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type TaskEither<L, R> = T.Task<E.Either<L, R>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "TaskEither";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: TaskEither<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const left = <E = never, A = never>(left: E): TaskEither<E, A> =>
  T.of(E.left(left));

export const right = <E = never, A = never>(right: A): TaskEither<E, A> =>
  T.of(E.right(right));

export const tryCatch = <E, A>(
  f: Lazy<A>,
  onError: (e: unknown) => E,
): TaskEither<E, A> =>
  () => {
    try {
      return Promise.resolve(E.right(f()));
    } catch (e) {
      return Promise.resolve(E.left(onError(e)));
    }
  };

export const fromFailableTask = <E, A>(onError: (e: unknown) => E) =>
  (ta: T.Task<A>): TaskEither<E, A> =>
    () => ta().then(E.right).catch((e) => E.left(onError(e)));

export const fromEither = <E, A>(ta: E.Either<E, A>): TaskEither<E, A> =>
  pipe(ta, E.fold((e) => left(e), right));

/*******************************************************************************
 * Utilities
 ******************************************************************************/

export const then = <A, B>(fab: (a: A) => B) =>
  (p: Promise<A>): Promise<B> => p.then(fab);

/*******************************************************************************
 * Modules (Parallel)
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fai) => (ta) => flow(ta, then(E.map(fai))),
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fab, fcd) => (tac) => () => tac().then(E.bimap(fab, fcd)),
  mapLeft: (fef) => (ta) => pipe(ta, Bifunctor.bimap(fef, identity)),
};

export const Apply: TC.Apply<URI> = {
  ap: flow(T.map(E.ap), T.ap),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: right,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) =>
    (ta) =>
      async () => {
        const ea = await ta();
        if (E.isLeft(ea)) {
          return ea;
        }
        return await fatb(ea.right)();
      },
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const MonadThrow: TC.MonadThrow<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Monad.join,
  chain: Chain.chain,
  throwError: left,
};

export const Alt: TC.Alt<URI> = ({
  map: Functor.map,
  alt: (tb) => (ta) => () => ta().then((te) => E.isLeft(te) ? tb() : te),
});

/*******************************************************************************
 * Modules (Sequential)
 ******************************************************************************/

// TODO Refactor in terms of Task.ap (Sequential)
export const ApplySeq: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) =>
      async () => {
        const efab = await tfab();
        const ea = await ta();
        return pipe(ea, E.ap(efab));
      },
  map: Functor.map,
};

export const ApplicativeSeq: TC.Applicative<URI> = {
  of: right,
  ap: ApplySeq.ap,
  map: Functor.map,
};

export const ChainSeq: TC.Chain<URI> = {
  ap: ApplySeq.ap,
  map: Functor.map,
  chain: Chain.chain,
};

export const MonadSeq: TC.Monad<URI> = {
  of: ApplicativeSeq.of,
  ap: ApplySeq.ap,
  map: Functor.map,
  join: ChainSeq.chain(identity),
  chain: ChainSeq.chain,
};

export const MonadThrowSeq: TC.MonadThrow<URI> = {
  of: ApplicativeSeq.of,
  ap: ApplySeq.ap,
  map: Functor.map,
  join: MonadSeq.join,
  chain: ChainSeq.chain,
  throwError: left,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const { bimap, mapLeft } = Bifunctor;

export const { ap: apSeq } = ApplySeq;

export const chainLeft = <E, A>(onLeft: (e: E) => TaskEither<E, A>) =>
  T.chain(E.fold<E, A, TaskEither<E, A>>(onLeft, right));

export const widen: <F>() => <E, A>(
  ta: TaskEither<E, A>,
) => TaskEither<E | F, A> = constant(identity);

// This leaks async ops so we cut it for now.
//export const timeout = <E, A>(ms: number, onTimeout: () => E) =>
//  (ta: TaskEither<E, A>): TaskEither<E, A> =>
//    () => Promise.race([ta(), wait(ms).then(flow(onTimeout, E.left))]);

/*******************************************************************************
 * Do Notation
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
