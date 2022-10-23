/**
// Creates a tree with `2^n` elements
(Gen 0) = (Leaf 1)
(Gen n) = (Node (Gen(- n 1)) (Gen(- n 1)))

// Adds all elements of a tree
(Sum (Leaf x))   = x
(Sum (Node a b)) = (+ (Sum a) (Sum b))

// Performs 2^n additions in parallel
(Main n) = (Sum (Gen n))
*/

export type Tree = number | { left: Tree; right: Tree };

export function gen(n: number): Tree {
  if (n <= 0) {
    return 1;
  }
  return Object.assign(Object.create(null), {
    left: gen(n - 1),
    right: gen(n - 1),
  });
}

export function sum(tree: Tree): number {
  if (typeof tree === "number") {
    return tree;
  }
  return sum(tree.left) + sum(tree.right);
}

export function main(n: number): number {
  return sum(gen(n));
}

export function array(n: number): Array<number> {
  return Array.from({ length: Math.pow(2, n) }, () => 1);
}

export function add(a: number, b: number): number {
  return a + b;
}

export function main2(n: number): number {
  return array(n).reduce(add, 0);
}

const arg = Deno.args[0];
const count = parseInt(arg, 10);
export const test = array(count);
console.log("Done");
