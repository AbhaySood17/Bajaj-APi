const EDGE_PATTERN = /^[A-Z]->[A-Z]$/;

const compareText = (a, b) => a.localeCompare(b);

const formatUserId = ({ fullName, dob }) => {
  const compactName = String(fullName || "johndoe")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const compactDob = String(dob || "17091999").replace(/\D/g, "");
  return `${compactName}_${compactDob}`;
};

const emptyResult = (identity) => ({
  user_id: formatUserId(identity),
  email_id: identity.email || "john.doe@college.edu",
  college_roll_number: identity.rollNumber || "21CS1001",
  hierarchies: [],
  invalid_entries: [],
  duplicate_edges: [],
  summary: {
    total_trees: 0,
    total_cycles: 0,
    largest_tree_root: ""
  }
});

const normalizeEdges = (data) => {
  const invalidEntries = [];
  const duplicateEdges = [];
  const duplicateEdgeSet = new Set();
  const firstSeenEdges = new Set();
  const acceptedEdges = [];

  for (const rawEntry of data) {
    const entry = String(rawEntry ?? "").trim();

    if (!EDGE_PATTERN.test(entry)) {
      invalidEntries.push(entry);
      continue;
    }

    const [parent, child] = entry.split("->");
    if (parent === child) {
      invalidEntries.push(entry);
      continue;
    }

    if (firstSeenEdges.has(entry)) {
      if (!duplicateEdgeSet.has(entry)) {
        duplicateEdgeSet.add(entry);
        duplicateEdges.push(entry);
      }
      continue;
    }

    firstSeenEdges.add(entry);
    acceptedEdges.push({ parent, child, label: entry });
  }

  return { acceptedEdges, invalidEntries, duplicateEdges };
};

const keepFirstParentPerChild = (edges) => {
  const childOwner = new Map();

  return edges.filter((edge) => {
    if (childOwner.has(edge.child)) {
      return false;
    }

    childOwner.set(edge.child, edge.parent);
    return true;
  });
};

const buildComponentMap = (edges) => {
  const adjacency = new Map();
  const touch = (node) => {
    if (!adjacency.has(node)) {
      adjacency.set(node, new Set());
    }
  };

  for (const { parent, child } of edges) {
    touch(parent);
    touch(child);
    adjacency.get(parent).add(child);
    adjacency.get(child).add(parent);
  }

  const visited = new Set();
  const components = [];

  for (const node of adjacency.keys()) {
    if (visited.has(node)) {
      continue;
    }

    const nodes = [];
    const stack = [node];
    visited.add(node);

    while (stack.length) {
      const current = stack.pop();
      nodes.push(current);

      for (const next of adjacency.get(current)) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }

    nodes.sort(compareText);
    components.push(new Set(nodes));
  }

  return components;
};

const componentHasCycle = (nodes, childrenByParent) => {
  const state = new Map();

  const walk = (node) => {
    state.set(node, "visiting");

    for (const child of childrenByParent.get(node) || []) {
      if (!nodes.has(child)) {
        continue;
      }

      const childState = state.get(child);
      if (childState === "visiting") {
        return true;
      }
      if (!childState && walk(child)) {
        return true;
      }
    }

    state.set(node, "done");
    return false;
  };

  return [...nodes].some((node) => !state.has(node) && walk(node));
};

const chooseRoot = (nodes, childrenInComponent) => {
  const childNodes = new Set(childrenInComponent);
  const roots = [...nodes].filter((node) => !childNodes.has(node)).sort(compareText);
  return roots[0] || [...nodes].sort(compareText)[0];
};

const nestFromRoot = (root, childrenByParent) => {
  const makeNode = (node) => {
    const branch = {};
    const children = [...(childrenByParent.get(node) || [])].sort(compareText);

    for (const child of children) {
      branch[child] = makeNode(child);
    }

    return branch;
  };

  return { [root]: makeNode(root) };
};

const measureDepth = (root, childrenByParent) => {
  const children = [...(childrenByParent.get(root) || [])];
  if (children.length === 0) {
    return 1;
  }

  return 1 + Math.max(...children.map((child) => measureDepth(child, childrenByParent)));
};

const summarize = (hierarchies) => {
  const trees = hierarchies.filter((item) => !item.has_cycle);
  const cycles = hierarchies.length - trees.length;
  const largest = trees
    .slice()
    .sort((a, b) => b.depth - a.depth || compareText(a.root, b.root))[0];

  return {
    total_trees: trees.length,
    total_cycles: cycles,
    largest_tree_root: largest?.root || ""
  };
};

export const processHierarchyPayload = (payload, identity = {}) => {
  const result = emptyResult(identity);

  if (!payload || !Array.isArray(payload.data)) {
    result.invalid_entries.push("data must be an array");
    return result;
  }

  const { acceptedEdges, invalidEntries, duplicateEdges } = normalizeEdges(payload.data);
  const graphEdges = keepFirstParentPerChild(acceptedEdges);
  const childrenByParent = new Map();

  for (const { parent, child } of graphEdges) {
    if (!childrenByParent.has(parent)) {
      childrenByParent.set(parent, []);
    }
    childrenByParent.get(parent).push(child);
  }

  const components = buildComponentMap(graphEdges);
  const hierarchies = components.map((nodes) => {
    const componentEdges = graphEdges.filter(
      ({ parent, child }) => nodes.has(parent) && nodes.has(child)
    );
    const childrenInComponent = componentEdges.map((edge) => edge.child);
    const root = chooseRoot(nodes, childrenInComponent);

    if (componentHasCycle(nodes, childrenByParent)) {
      return { root, tree: {}, has_cycle: true };
    }

    return {
      root,
      tree: nestFromRoot(root, childrenByParent),
      depth: measureDepth(root, childrenByParent)
    };
  });

  result.hierarchies = hierarchies;
  result.invalid_entries = invalidEntries;
  result.duplicate_edges = duplicateEdges;
  result.summary = summarize(hierarchies);

  return result;
};
