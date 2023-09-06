import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Mappable } from "./mappable.ts";
import type { Sync } from "./sync.ts";
import type { Wrappable } from "./wrappable.ts";

import { resolve, wait } from "./promise.ts";
import { handleThrow } from "./fn.ts";

export type Async<A> = Sync<Promise<A>>;

export interface KindAsync extends Kind {
  readonly kind: Async<Out<this, 0>>;
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

export function wrap<A>(a: A): Async<A> {
  return () => resolve(a);
}

export function map<A, I>(fai: (a: A) => I): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then(fai);
}

export function apply<A>(
  ua: Async<A>,
): <I>(ufai: Async<(a: A) => I>) => Async<I> {
  return (ufai) => () => Promise.all([ufai(), ua()]).then(([fai, a]) => fai(a));
}

export function applySequential<A>(
  ua: Async<A>,
): <I>(ufai: Async<(a: A) => I>) => Async<I> {
  return (ufai) => async () => (await ufai())(await ua());
}

export function flatmap<A, I>(
  fati: (a: A) => Async<I>,
): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then((a) => fati(a)());
}

export const WrappableAsync: Wrappable<KindAsync> = { wrap };

export const ApplicableAsync: Applicable<KindAsync> = { apply, map, wrap };

export const MappableAsync: Mappable<KindAsync> = { map };

export const FlatmappableAsync: Flatmappable<KindAsync> = {
  apply,
  flatmap,
  map,
  wrap,
};
