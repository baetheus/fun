import * as S from "../semigroup.ts";

export type T1 = {
  one: string;
  two: number;
};

const mySemi = S.getStructSemigroup<T1>({
  one: S.getFirstSemigroup(),
  two: S.semigroupProduct,
});

const t1: T1 = { one: "Hello", two: 10 };
const t2: T1 = { one: "World", two: 12 };

const r1 = mySemi.concat(t1)(t2);

console.log(r1);
