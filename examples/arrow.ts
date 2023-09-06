import type { $, Kind } from "../kind.ts";

export type Arrow<
  U extends Kind,
  A,
  I,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
> = (a: A) => $<U, [I, J, K], [L], [M]>;

export type LiftFn<U extends Kind> = <
  A,
  I,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(fai: (a: A) => I) => Arrow<U, A, I, J, K, L, M>;
