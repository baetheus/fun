import * as O from "../optics.ts";
import * as P from "../predicate.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

const log = <P>(name: string, value: P) =>
  console.log(name, JSON.stringify(value, null, 2));

export type Friends = {
  people: readonly {
    name: string;
    pets?: readonly {
      name: string;
      nickname?: string;
      toys: readonly string[];
    }[];
  }[];
};

// Lens easily deep into a structure.
export const toysOptic = pipe(
  O.id<Friends>(),
  O.prop("people"),
  O.array,
  O.prop("pets"),
  O.nilable,
  O.array,
  O.prop("toys"),
  O.array,
);

// Lens over an array of numbers
// and collect them all into a single predicate
export const testFactors = pipe(
  O.id<readonly number[]>(),
  O.array,
  O.concatAll(P.getMonoidAll<number>(), N.divides),
);

// First lets create some data we are working with
type Person = { name: string; age: number; children?: People };
type People = readonly Person[];

function person(name: string, age: number, children?: People): Person {
  return { name, age, children };
}

const rufus = person("Rufus", 0.8);
const clementine = person("Clementine", 0.5);
const brandon = person("Brandon", 37, [rufus, clementine]);
const jackie = person("Jackie", 57, [brandon]);

// Now lets make some Optics
const children = pipe(O.id<Person>(), O.prop("children"), O.nilable, O.array);

// We can
const grandchildren = pipe(
  children,
  O.compose(children),
);

const names = O.prop<Person, "name">("name");

const jackiesChildren = pipe(children, names, O.view)(jackie);
const jackiesGrandchildren = pipe(grandchildren, names, O.view)(jackie);

log("Jackie's Children", jackiesChildren);
log("Jackie's Grandchildren", jackiesGrandchildren);

type Todo = { text: string; completed: boolean };
type Todos = readonly Todo[];

const todo = (text: string, completed: boolean = false): Todo => ({
  text,
  completed,
});

const myTodos: Todos = [
  todo("Write some good examples for Optics"),
  todo("Make sure the examples actually work"),
  todo("Make some coffee"),
  todo("Drink some coffee"),
];

// Focus on the completed field of the todos
const completed = pipe(O.id<Todos>(), O.array, O.prop("completed"));
const markAllAsCompleted = completed.modify(() => true);

// This is a new Todos object with new Todo objects all with completed
// set to true
const newTodos = markAllAsCompleted(myTodos);

log("New Todos", newTodos);
