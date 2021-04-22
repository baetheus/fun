import * as O from "../option.ts";
import { pipe } from "../fns.ts";

const t1 = pipe(
  O.some("Hello"),
  O.bindTo("one"),
  O.bind("two", ({ one }) => O.some(`${one} World`)),
);

console.log(t1);
