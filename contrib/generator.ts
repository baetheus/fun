import type { In, Kind, Out } from "../kind.ts";
import type { Flatmappable } from "../flatmappable.ts";

import { todo } from "../fn.ts";

export interface KindGenerator extends Kind {
  readonly kind: Generator<Out<this, 0>, Out<this, 1>, In<this, 0>>;
}

export const FlatmappableGenerator: Flatmappable<KindGenerator> = {
  wrap: (a) => {
    const ret = function* () {
      yield a;
      return undefined;
    };
    return ret;
  },
  map: todo(),
  apply: todo(),
  flatmap: todo(),
};
