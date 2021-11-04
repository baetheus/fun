import type * as T from "./types.ts";

export function equals(second: string): (first: string) => boolean {
  return (first) => first === second;
}

export const Setoid: T.Setoid<string> = { equals };
