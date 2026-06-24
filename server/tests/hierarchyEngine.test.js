import assert from "node:assert/strict";
import { processHierarchyPayload } from "../src/hierarchyEngine.js";

const identity = {
  fullName: "John Doe",
  dob: "17091999",
  email: "john.doe@college.edu",
  rollNumber: "21CS1001"
};

const result = processHierarchyPayload(
  {
    data: [
      "A->B",
      "A->C",
      "B->D",
      "C->E",
      "E->F",
      "X->Y",
      "Y->Z",
      "Z->X",
      "P->Q",
      "Q->R",
      "G->H",
      "G->H",
      "G->H",
      "G->I",
      "hello",
      "1->2",
      "A->",
      " A->B ",
      "A->A"
    ]
  },
  identity
);

assert.equal(result.user_id, "johndoe_17091999");
assert.deepEqual(result.invalid_entries, ["hello", "1->2", "A->", "A->A"]);
assert.deepEqual(result.duplicate_edges, ["G->H", "A->B"]);
assert.equal(result.summary.total_trees, 3);
assert.equal(result.summary.total_cycles, 1);
assert.equal(result.summary.largest_tree_root, "A");

const aTree = result.hierarchies.find((item) => item.root === "A");
assert.equal(aTree.depth, 4);
assert.deepEqual(aTree.tree, {
  A: {
    B: { D: {} },
    C: { E: { F: {} } }
  }
});

const cycle = result.hierarchies.find((item) => item.root === "X");
assert.deepEqual(cycle, { root: "X", tree: {}, has_cycle: true });

const multiParent = processHierarchyPayload({ data: ["A->D", "B->D", "B->E"] }, identity);
assert.deepEqual(multiParent.hierarchies, [
  { root: "A", tree: { A: { D: {} } }, depth: 2 },
  { root: "B", tree: { B: { E: {} } }, depth: 2 }
]);

console.log("hierarchyEngine tests passed");
