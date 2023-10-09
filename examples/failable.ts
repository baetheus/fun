import type { Kind } from "../kind.ts";
import type { Failable } from "../failable.ts";

export function createTryAll<U extends Kind>(F: Failable<U>) {
}
