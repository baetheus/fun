import * as O from "../optics.ts";
import { pipe } from "../fn.ts";

export type Friends = {
  people: readonly {
    name: string;
    pets?: readonly {
      name: string;
      nickname?: string;
      toys: readonly string[];
    }[];
  }[];
};

export const toysOptic = pipe(
  O.id<Friends>(),
  O.prop("people"),
  O.array,
  O.prop("pets"),
  O.nilable,
  O.array,
  O.prop("toys"),
  O.array,
);
