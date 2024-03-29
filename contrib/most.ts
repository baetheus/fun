import type { $, Kind, Nest, Out } from "../kind.ts";
import type { Applicable } from "../applicable.ts";
import type { Bind, Flatmappable, Tap } from "../flatmappable.ts";
import type { BindTo, Mappable } from "../mappable.ts";
import type { Scheduler, Sink, Stream } from "npm:@most/types@1.1.0";
import type { Wrappable } from "../wrappable.ts";

import * as M from "npm:@most/core@1.6.1";
import { createBind, createTap } from "../flatmappable.ts";
import { createBindTo } from "../mappable.ts";
import { flow, pipe } from "../fn.ts";

export * from "npm:@most/core@1.6.1";
export * from "npm:@most/hold@4.1.0";
export * from "npm:@most/adapter@1.0.0";
export { newDefaultScheduler, newScheduler } from "npm:@most/scheduler@1.3.0";

export interface KindStream extends Kind {
  readonly kind: Stream<Out<this, 0>>;
}

export function count<A>(sa: Stream<A>): Stream<number> {
  return keepIndex(withCount(sa));
}

export function withCount<A>(sa: Stream<A>): Stream<[number, A]> {
  return withIndexStart(1, sa);
}

export function index<A>(sa: Stream<A>): Stream<number> {
  return keepIndex(withIndex(sa));
}

export function withIndex<A>(sa: Stream<A>): Stream<[number, A]> {
  return withIndexStart(0, sa);
}

export function withIndexStart<A>(
  start: number,
  sa: Stream<A>,
): Stream<[number, A]> {
  return indexed((i) => [i, i + 1], start, sa);
}

export function indexed<S, I, A>(
  f: (s: S) => [I, S],
  init: S,
  sa: Stream<A>,
): Stream<[I, A]> {
  return M.loop(
    (s, a) => {
      const [index, seed] = f(s);
      return { seed, value: [index, a] };
    },
    init,
    sa,
  );
}

export function keepIndex<I>(s: Stream<[I, unknown]>): Stream<I> {
  return M.map((ia) => ia[0], s);
}

export async function collect<A>(
  stream: Stream<A>,
  scheduler: Scheduler,
): Promise<readonly A[]> {
  const as: A[] = [];
  await M.runEffects(pipe(stream, M.tap((a) => as.push(a))), scheduler);
  return as;
}

export function sink<A>(
  event: (time: number, value: A) => void,
  error: (e: unknown) => void,
  end: () => void,
): Sink<A> {
  return { event, end, error };
}

export const debugSink: Sink<unknown> = sink(
  console.log,
  console.error,
  console.log,
);

const noop = () => {};
export const voidSink: Sink<unknown> = sink(noop, noop, noop);

export const wrap: Wrappable<KindStream>["wrap"] = M.now;

export const map: Mappable<KindStream>["map"] = M.map;

export const apply: Applicable<KindStream>["apply"] = M.ap;

export const flatmap: Flatmappable<KindStream>["flatmap"] = (faui) => (ua) =>
  pipe(
    ua,
    M.map(faui),
    M.switchLatest,
  );

export const WrappableStream: Wrappable<KindStream> = { wrap };

export const MappableStream: Mappable<KindStream> = { map };

export const ApplicableStream: Applicable<KindStream> = { wrap, map, apply };

export const FlatmappableStream: Flatmappable<KindStream> = {
  wrap,
  map,
  apply,
  flatmap,
};

export const bind: Bind<KindStream> = createBind(FlatmappableStream);

export const bindTo: BindTo<KindStream> = createBindTo(FlatmappableStream);

export const tap: Tap<KindStream> = createTap(FlatmappableStream);

export interface TransformStream<U extends Kind> extends Kind {
  readonly kind: Stream<Nest<U, this>>;
}

export function transformStream<U extends Kind>(
  FM: Flatmappable<U>,
  extract: <
    I,
    J = unknown,
    K = unknown,
    L = never,
    M = never,
    B = unknown,
    C = unknown,
    D = never,
    E = never,
  >(
    usua: $<U, [Stream<$<U, [I, J, K], [L], [M]>>, B, C], [D], [E]>,
  ) => Stream<$<U, [I, J | B, K | C], [L & D], [M & E]>>,
): Flatmappable<TransformStream<U>> {
  return {
    wrap: (a) => wrap(FM.wrap(a)),
    map: (fai) => map(FM.map(fai)),
    apply: M.combine(FM.apply) as Flatmappable<TransformStream<U>>["apply"],
    flatmap: (faui) => (sua) =>
      pipe(
        sua,
        flatmap(flow(FM.map(faui), extract)),
      ),
  };
}

export type * from "npm:@most/types@1.1.0"; /** Export types */
