import { createBind, createTap } from "../flatmappable.ts";
import { createBindTo } from "../mappable.ts";
import { FlatmappableOption, MappableOption } from "../option.ts";

import { pipe } from "../fn.ts";
import * as O from "../option.ts";

const bind = createBind(FlatmappableOption);
const tap = createTap(FlatmappableOption);
const bindTo = createBindTo(MappableOption);

const test = pipe(
  O.wrap(1),
  bindTo("one"),
  tap((n) => console.log(n)),
  bind("two", ({ one }) => O.wrap(one + one)),
);
