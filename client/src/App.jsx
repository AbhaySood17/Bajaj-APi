import { AlertTriangle, GitBranch, Loader2, Network, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { submitEdges } from "./api.js";

const sampleInput = `A->B
A->C
B->D
C->E
E->F
X->Y
Y->Z
Z->X
P->Q
Q->R
G->H
G->H
G->I
hello
1->2
A->`;

const splitInput = (value) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const TreeNode = ({ label, value }) => {
  const children = Object.entries(value || {});

  return (
    <li>
      <span>{label}</span>
      {children.length > 0 && (
        <ul>
          {children.map(([childLabel, childValue]) => (
            <TreeNode key={childLabel} label={childLabel} value={childValue} />
          ))}
        </ul>
      )}
    </li>
  );
};

const HierarchyCard = ({ hierarchy }) => {
  const treeEntries = Object.entries(hierarchy.tree || {});

  return (
    <article className="hierarchy-card">
      <header>
        <div>
          <p className="eyebrow">Root</p>
          <h3>{hierarchy.root}</h3>
        </div>
        <span className={hierarchy.has_cycle ? "status danger" : "status ok"}>
          {hierarchy.has_cycle ? "Cycle" : `Depth ${hierarchy.depth}`}
        </span>
      </header>

      {hierarchy.has_cycle ? (
        <div className="cycle-state">
          <AlertTriangle size={18} />
          <span>Cyclic group detected</span>
        </div>
      ) : (
        <ul className="tree-view">
          {treeEntries.map(([label, value]) => (
            <TreeNode key={label} label={label} value={value} />
          ))}
        </ul>
      )}
    </article>
  );
};

function App() {
  const [input, setInput] = useState(sampleInput);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedItems = useMemo(() => splitInput(input), [input]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await submitEdges(parsedItems);
      setResult(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to reach the API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="input-pane">
          <div className="brand-row">
            <Network size={28} />
            <div>
              <p className="eyebrow">POST /bfhl</p>
              <h1>Hierarchy Inspector</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="edge-input">Node list</label>
            <textarea
              id="edge-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck="false"
            />
            <div className="form-footer">
              <span>{parsedItems.length} entries ready</span>
              <button type="submit" disabled={loading}>
                {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                Submit
              </button>
            </div>
          </form>

          {error && <div className="error-box">{error}</div>}
        </aside>

        <section className="result-pane">
          {result ? (
            <>
              <div className="summary-grid">
                <div>
                  <p className="eyebrow">Trees</p>
                  <strong>{result.summary.total_trees}</strong>
                </div>
                <div>
                  <p className="eyebrow">Cycles</p>
                  <strong>{result.summary.total_cycles}</strong>
                </div>
                <div>
                  <p className="eyebrow">Largest root</p>
                  <strong>{result.summary.largest_tree_root || "-"}</strong>
                </div>
              </div>

              <div className="identity-strip">
                <span>{result.user_id}</span>
                <span>{result.email_id}</span>
                <span>{result.college_roll_number}</span>
              </div>

              <div className="hierarchy-grid">
                {result.hierarchies.map((hierarchy) => (
                  <HierarchyCard key={`${hierarchy.root}-${hierarchy.has_cycle || "tree"}`} hierarchy={hierarchy} />
                ))}
              </div>

              <div className="lists-row">
                <section>
                  <h2>Invalid entries</h2>
                  <p>{result.invalid_entries.length ? result.invalid_entries.join(", ") : "None"}</p>
                </section>
                <section>
                  <h2>Duplicate edges</h2>
                  <p>{result.duplicate_edges.length ? result.duplicate_edges.join(", ") : "None"}</p>
                </section>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <GitBranch size={34} />
              <h2>Submit edges to inspect the graph</h2>
              <p>The response will appear here as tree cards, cycle markers, and validation lists.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
