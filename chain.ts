import type { $, Kind, TypeClass } from "./kind.ts";
import type { Apply } from "./apply.ts";

/**
 * Chain
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#chain
 */
export interface Chain<U extends Kind> extends TypeClass<U>, Apply<U> {
  readonly chain: <A, I, J = never, K = never, D = unknown, E = unknown>(
    fati: (a: A) => $<U, [I, J, K], [D], [E]>
  ) => <B = never, C = never>(
    ta: $<U, [A, B, C], [D], [E]>
  ) => $<U, [I, B | J, C | K], [D], [E]>;
}

/**
 * ChainRec
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#chain
 */
export interface ChainRec<U extends Kind> extends TypeClass<U>, Chain<U> {
  readonly chainRec: <A, B, I, J = never, K = never, D = unknown, E = unknown>(
    fati: (a: A) => $<U, [I, J, K], [D], [E]>,
    a: A
  ) => $<U, [B, J, K], [D], [E]>;
}

// chainFirst
export function chainFirst<U extends Kind>(
  M: Chain<U>
): <A, I, J = never, K = never, D = unknown, E = unknown>(
  f: (a: A) => $<U, [I, J, K], [D], [E]>
) => <B, C>(ma: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]> {
  // @ts-expect-error <type-errors> TODO: @baetheus
  return (f) => (ma) => M.chain((a) => M.map(() => a)(f(a)))(ma);
}

// bind
export function bind<U extends Kind>(
  M: Chain<U>
): <
  N extends string,
  A,
  B,
  C,
  I,
  J = never,
  K = never,
  D = unknown,
  E = unknown
>(
  name: Exclude<N, keyof A>,
  f: (a: A) => $<U, [I, J, K], [D], [E]>
) => <B, C>(
  ma: $<U, [A, B, C], [D], [E]>
) => $<
  U,
  [{ readonly [K in keyof A | N]: K extends keyof A ? A[K] : I }],
  [D],
  [E]
> {
  return (name, f) =>
    // @ts-expect-error <type-errors> TODO: @baetheus
    M.chain((a) =>
      M.map((b) => Object.assign({}, a, { [name]: b }) as any)(f(a))
    );
}
