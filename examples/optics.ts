import * as L from "../optics/lens.ts";
import { pipe } from "../fns.ts";

type T1 = {
  one: number;
  two: {
    three: string;
    four: string;
    five: string;
  };
};

export const l1 = pipe(
  L.id<T1>(),
  L.prop("one"),
);

export const l2 = pipe(
  L.id<T1>(),
  L.prop("two"),
  L.props("three", "four"),
);

const v1: T1 = {
  one: 1,
  two: {
    three: "three",
    four: "four",
    five: "five",
  },
};

const v2: T1 = {
  one: 1,
  two: {
    three: "3",
    four: "4",
    five: "5",
  },
};

const vs = [v1, v2];

vs.forEach((v) => {
  console.log("Get", { l1: l1.get(v), l2: l2.get(v) });
  console.log("Set", {
    l1: l1.set(10)(v),
    l2: l2.set({ three: "junk", four: "cludge" })(v),
  });
});
