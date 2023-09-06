import { pipe } from "../fn.ts";
import * as C from "../comparable.ts";

const Struct = pipe(
  C.struct({ one: C.boolean }),
  C.intersect(C.partial({ two: C.number })),
);
type Struct = C.TypeOf<typeof Struct>;

const tests: [Struct, Struct][] = [[{ one: true, two: 1 }, {
  one: true,
  two: 2,
}]];

tests.forEach(([first, second], index) => {
  console.log(`Test ${index}`, {
    first,
    second,
    compare: Struct.compare(second)(first),
  });
});
