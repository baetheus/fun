import * as E from "../either.ts";
import * as D from "../schemable/decoder.ts";
import * as R from "../schemable/result.ts";
import { flow, pipe } from "../fns.ts";

export const date: D.Decoder<unknown, Date> = flow(
  pipe(D.string, D.union(D.number)),
  R.chain((sn) => {
    const result = new Date(sn);
    return isNaN(result.getTime())
      ? D.failure(sn, "string or number representation of date")
      : D.success(result);
  }),
);

const values: unknown[] = [
  null,
  "10/12/2012",
  new Date(Date.now()).toISOString(),
  "___",
  {},
  [],
  undefined,
  new Map([[1, 2]]),
  [[]],
  Date.now(),
];

values.forEach((x) => {
  console.log(`Decoding ${x}`);
  pipe(x, date, D.extract, E.fold(console.warn, console.log));
});
