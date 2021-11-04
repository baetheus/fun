import type * as T from "./types.ts";

export function equals(second: number): (first: number) => boolean {
  return (first) => first === second;
}

export const Setoid: T.Setoid<number> = { equals };
