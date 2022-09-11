import type * as T from "./types.ts";

export function equals(second: boolean): (first: boolean) => boolean {
  return (first) => first === second;
}

export const Setoid: T.Setoid<boolean> = { equals };

export const constTrue = () => true;

export const constFalse = () => false;
