import type { ReadonlyRecord } from "../record.ts";
import type { DatumEither } from "../datum_either.ts";

import * as D from "../ideas/dux.ts";
import * as O from "../optic.ts";
import * as P from "../promise.ts";
import * as S from "../stream.ts";
import { pipe } from "../fn.ts";

const BOOKS: ReadonlyRecord<Book> = {
  "a1": { id: "a1", author: "Tom Robbins", title: "Jitterbug Perfume" },
  "a2": {
    id: "a2",
    author: "Elizabeth Moon",
    title: "The Deed of Paksenarrion",
  },
};

type Book = {
  readonly id: string;
  readonly author: string;
  readonly title: string;
};

type MyState = {
  readonly books: ReadonlyRecord<DatumEither<string, Book>>;
};

const INITIAL_STATE: MyState = { books: {} };

export const actionCreator = D.actionGroup("STORE");

export const getBookAction = actionCreator.async<string, Book, string>(
  "GET_BOOK",
);

export const getBookReducer = D.asyncCollectionRecord(
  getBookAction,
  pipe(O.id<MyState>(), O.prop("books")),
  (id) =>
    pipe(
      O.id<ReadonlyRecord<DatumEither<string, Book>>>(),
      O.atKey(id),
    ),
);

export const getBookEffect = D.onAction(
  getBookAction.pending,
  (id) => {
    return pipe(
      P.wait(Math.random() * 1000),
      P.map(() =>
        id in BOOKS
          ? getBookAction.success({ params: id, result: BOOKS[id] })
          : getBookAction.failure({
            params: id,
            error: `Book with id ${id} does not exist`,
          })
      ),
    );
  },
);

const store = D.createStore(INITIAL_STATE, getBookReducer, getBookEffect);

// State connection 1
pipe(
  store.state,
  S.forEach((state) => console.log("OUTPUT 1", state)),
);

// Optic to look at book at id a1
const bookA1 = pipe(
  O.id<MyState>(),
  O.prop("books"),
  O.atKey("a1"),
  O.some,
  O.success,
  O.props("title", "author"),
);

// State connection 2: selecting book a1
pipe(
  store.state,
  S.map(bookA1.view),
  S.forEach((state) => console.log("OUTPUT 2", state)),
);

// After a second, get book a1
setTimeout(() => {
  store.dispatch(getBookAction.pending("a1"));
}, 1000);
