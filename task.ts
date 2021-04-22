import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import { Lazy } from "./types.ts";

import { apply, flow, wait, identity } from "./fns.ts";
import { createDo } from "./derivations.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Task<A> = () => Promise<A>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Task";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Task<_[0]>;
  }
}

/*******************************************************************************
 * Combinators
 ******************************************************************************/

export const make = <A>(a: A): Task<A> => () => Promise.resolve(a);

export const delay = (ms: number) =>
  <A>(ma: Task<A>): Task<A> => () => wait(ms).then(ma);

export const fromThunk = <A>(fa: Lazy<A>): Task<A> =>
  () => Promise.resolve(fa());

export const tryCatch = <A>(fa: Lazy<A>, onError: (e: unknown) => A): Task<A> =>
  () => {
    try {
      return Promise.resolve(fa());
    } catch (e) {
      return Promise.resolve(onError(e));
    }
  };

/*******************************************************************************
 * Modules (Parallel)
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => () => ta().then(fab),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) => () => Promise.all([tfab(), ta()]).then(([f, a]) => f(a)),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: (a) => () => Promise.resolve(a),
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) => (ta) => () => ta().then(flow(fatb, apply())),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

/*******************************************************************************
 * Modules (Sequential)
 ******************************************************************************/

export const ApplySeq: TC.Apply<URI> = {
  ap: (tfab) => (ta) => async () => (await tfab())(await ta()),
  map: Functor.map,
};

export const MonadSeq: TC.Monad<URI> = {
  of: Applicative.of,
  ap: ApplySeq.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const { ap: apSeq } = ApplySeq;

/*******************************************************************************
 * Do Notation
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
