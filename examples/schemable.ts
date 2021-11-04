import * as S from "../schemable.ts";
import * as D from "../decoder.ts";
import * as E from "../either.ts";
import { flow } from "../fns.ts";

export const Thing = S.schema((s) => s.array(s.literal("stuff")));

export type Thing = S.TypeOf<typeof Thing>;

export const Demo = S.schema((s) =>
  s.struct({
    one: s.string(),
    two: s.partial({
      three: s.string(),
      four: s.literal(1, 2),
      five: s.nullable(s.string()),
    }),
    things: Thing(s),
    maybeNull: s.nullable(s.string()),
  })
);

export type Demo = S.TypeOf<typeof Demo>;

export const decode = Demo(D.Schemable);

export const print = flow(
  decode,
  D.extract,
  E.fold(console.error, console.log),
);

[null, undefined, {}, [], { one: "one", two: {}, things: [] }, {
  one: "one",
  things: ["stuff", "things"],
}].forEach(print);
