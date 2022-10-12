import * as AI from "../async_iterable.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";
import { resolve, then } from "../promise.ts";
import { isNil } from "../nilable.ts";

const decoder = new TextDecoder();

const extractBodyAsText = (res: Response): Promise<E.Either<string, string>> =>
  isNil(res.body) ? resolve(E.left("No Body!")) : pipe(
    res.body,
    AI.map((uint) => decoder.decode(uint)),
    AI.reduce((acc, cur) => acc + cur, ""),
    then(E.right),
  );

const result = pipe(
  fetch("https://github.com"),
  then(extractBodyAsText),
);

console.log(await result);
