import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Trash2, Edit2, Check, RotateCcw, AlertTriangle, ArrowUp, ArrowDown, Save, FolderOpen, Play, ArrowLeft, ArrowRight } from "lucide-react";

export default function Planner() {
  const { dailyPlans, setDailyPlans, setTimerIsRunning, setTimerMode, setTimerSeconds, setTimerActivePlanId, tracks, projects, goals, dsaProblems } = useApp();
  
  // Date picker state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Create / Edit forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ start: "09:00 AM", end: "11:00 AM", estimatedMinutes: 120, label: "", desc: "", category: "must", sourceId: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ start: "", end: "", estimatedMinutes: 120, label: "", desc: "", category: "must" });

  const activePlans = dailyPlans[selectedDate] || [];

  const updatePlansForDate = (updatedPlans) => {
    setDailyPlans(prev => ({
      ...prev,
      [selectedDate]: updatedPlans
    }));
  };

  const addBlock = (e) => {
    e.preventDefault();
    if (!newForm.label.trim()) return;

    const block = {
      id: "p-block-" + Date.now(),
      ...newForm,
      completed: false
    };

    updatePlansForDate([...activePlans, block]);
    setNewForm({ start: "09:00 AM", end: "11:00 AM", estimatedMinutes: 120, label: "", desc: "", category: newForm.category, sourceId: "" });
    setShowAddForm(false);
  };

  const deleteBlock = (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      updatePlansForDate(activePlans.filter(p => p.id !== id));
    }
  };

  const startEdit = (block) => {
    setEditingId(block.id);
    setEditForm({ ...block });
  };

  const saveEdit = (id) => {
    updatePlansForDate(activePlans.map(p => p.id === id ? { ...p, ...editForm } : p));
    setEditingId(null);
  };

  const toggleBlockCompleted = (id) => {
    updatePlansForDate(activePlans.map(p => p.id === id ? { ...p, completed: !p.completed } : p));
  };

  // Reordering index within the same category
  const reorderBlock = (index, direction, category) => {
    const categoryItems = activePlans.filter(p => p.category === category);
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === categoryItems.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const item1 = categoryItems[index];
    const item2 = categoryItems[targetIndex];

    // Reconstruct list keeping original indices of other categories
    const updated = [...activePlans];
    const idx1 = updated.findIndex(p => p.id === item1.id);
    const idx2 = updated.findIndex(p => p.id === item2.id);

    updated[idx1] = item2;
    updated[idx2] = item1;

    updatePlansForDate(updated);
  };

  // Shift Category (Must Do -> Should Do -> Optional)
  const shiftCategory = (id, direction) => {
    const categories = ["must", "should", "optional"];
    updatePlansForDate(activePlans.map(p => {
      if (p.id === id) {
        const curIdx = categories.indexOf(p.category);
        let nextIdx = curIdx;
        if (direction === "next" && curIdx < 2) nextIdx = curIdx + 1;
        if (direction === "prev" && curIdx > 0) nextIdx = curIdx - 1;
        return { ...p, category: categories[nextIdx] };
      }
      return p;
    }));
  };

  // Templates
  const saveAsTemplate = () => {
    if (activePlans.length === 0) {
      alert("No plans to save! Create some daily blocks first.");
      return;
    }
    localStorage.setItem("lp_saved_plans_template", JSON.stringify(activePlans));
    alert("Plan structure saved as default template successfully!");
  };

  const loadFromTemplate = () => {
    const saved = localStorage.getItem("lp_saved_plans_template");
    if (!saved) {
      alert("No templates found in memory. Save a plan template first.");
      return;
    }
    if (window.confirm("Overwrite current planner items for this date with template?")) {
      const loaded = JSON.parse(saved).map(p => ({
        ...p,
        id: "p-block-" + Date.now() + Math.random().toString().split(".")[1],
        completed: false
      }));
      updatePlansForDate(loaded);
    }
  };

  // Launch Focus timer
  const startTimerForBlock = (block) => {
    setTimerIsRunning(false);
    setTimerMode("focus");
    setTimerSeconds(0);
    setTimerActivePlanId(block.id);
    setTimerIsRunning(true);
    alert(`Focus countdown timer initialized for: ${block.label}!`);
  };

  // Columns filter
  const mustPlans = activePlans.filter(p => p.category === "must");
  const shouldPlans = activePlans.filter(p => p.category === "should");
  const optionalPlans = activePlans.filter(p => p.category === "optional");

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Execution Daily Planner</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Plan daily execution blocks across three key priority tiers: Must Do, Should Do, and Optional.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={loadFromTemplate} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FolderOpen size={14} />
            <span>Load Template</span>
          </button>
          <button onClick={saveAsTemplate} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Save size={14} />
            <span>Save Template</span>
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Plus size={14} />
            <span>Add Block</span>
          </button>
        </div>
      </div>

      {/* Date Pick */}
      <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Plan Date:</span>
        <input 
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setEditingId(null);
          }}
          style={{ width: "auto", padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
        />
        {selectedDate === new Date().toISOString().split("T")[0] && (
          <span style={{
            fontSize: "0.7rem",
            background: "rgba(var(--accent-rgb), 0.1)",
            color: "var(--accent)",
            border: "1px solid rgba(var(--accent-rgb), 0.3)",
            padding: "2px 8px",
            borderRadius: "4px",
            fontWeight: "bold"
          }}>Today</span>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={addBlock} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--accent)" }}>
          <div className="glass-card-header">
            <h3>Add Timeline Task Block</h3>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Start Time (e.g. 09:00 AM)</label>
              <input type="text" value={newForm.start} onChange={(e) => setNewForm({ ...newForm, start: e.target.value })} placeholder="09:00 AM" required />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>End Time (e.g. 11:00 AM)</label>
              <input type="text" value={newForm.end} onChange={(e) => setNewForm({ ...newForm, end: e.target.value })} placeholder="11:00 AM" required />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Priority Tier</label>
              <select value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}>
                <option value="must">🔴 Must Do (Core)</option>
                <option value="should">🟡 Should Do (Projects)</option>
                <option value="optional">🟢 Optional (Leisure)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Estimated Minutes</label>
              <input type="number" min="5" step="5" value={newForm.estimatedMinutes} onChange={(e) => setNewForm({ ...newForm, estimatedMinutes: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--accent)", marginBottom: "4px", display: "block" }}>Pull from Backlog (Optional)</label>
              <select value={newForm.sourceId} onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setNewForm({ ...newForm, sourceId: "" });
                  return;
                }
                const opt = e.target.options[e.target.selectedIndex];
                setNewForm({ ...newForm, sourceId: val, label: opt.text.toUpperCase() });
              }}>
                <option value="">-- Custom Task --</option>
                <optgroup label="Goals">
                  {goals.filter(g => !g.completed).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </optgroup>
                <optgroup label="Projects (Idea/Doing)">
                  {projects.filter(p => p.status !== "done").map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </optgroup>
                <optgroup label="Learning Tracks">
                  {tracks.filter(t => t.status !== "completed").map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </optgroup>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Task Title</label>
              <input type="text" value={newForm.label} onChange={(e) => setNewForm({ ...newForm, label: e.target.value.toUpperCase() })} placeholder="e.g. DSA PRACTICE" required />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Description/Details</label>
              <input type="text" value={newForm.desc} onChange={(e) => setNewForm({ ...newForm, desc: e.target.value })} placeholder="e.g. Complete 3 LinkedList problems" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Task</button>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {editingId && (
        <form onSubmit={(e) => { e.preventDefault(); saveEdit(editingId); }} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--ms-yellow)" }}>
          <div className="glass-card-header">
            <h3 style={{ color: "var(--ms-yellow)" }}>Edit Task Block</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr", gap: "1rem", alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Start</label>
              <input type="text" value={editForm.start} onChange={(e) => setEditForm({ ...editForm, start: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>End</label>
              <input type="text" value={editForm.end} onChange={(e) => setEditForm({ ...editForm, end: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Tier</label>
              <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                <option value="must">Must Do</option>
                <option value="should">Should Do</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Title</label>
              <input type="text" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value.toUpperCase() })} required />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Description</label>
              <input type="text" value={editForm.desc} onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" style={{ background: "var(--ms-yellow)", color: "#000" }}>Apply</button>
          </div>
        </form>
      )}

      {/* Grid columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
        
        {/* MUST DO COLUMN */}
        <div className="glass-card" style={{ borderTop: "3px solid #f25022", padding: "0.75rem" }}>
          <div className="glass-card-header" style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ color: "#f25022" }}>🔴 Must Do (High Focus)</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{mustPlans.length} tasks</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {mustPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                No urgent tasks logged.
              </div>
            ) : (
              mustPlans.map((block, idx) => renderTaskCard(block, idx, "must"))
            )}
          </div>
        </div>

        {/* SHOULD DO COLUMN */}
        <div className="glass-card" style={{ borderTop: "3px solid #ffb900", padding: "0.75rem" }}>
          <div className="glass-card-header" style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ color: "#ffb900" }}>🟡 Should Do (Medium Focus)</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{shouldPlans.length} tasks</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {shouldPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                No standard items planned.
              </div>
            ) : (
              shouldPlans.map((block, idx) => renderTaskCard(block, idx, "should"))
            )}
          </div>
        </div>

        {/* OPTIONAL COLUMN */}
        <div className="glass-card" style={{ borderTop: "3px solid #7fba00", padding: "0.75rem" }}>
          <div className="glass-card-header" style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ color: "#7fba00" }}>🟢 Optional (Low Focus)</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{optionalPlans.length} tasks</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {optionalPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                No leisure / optional items.
              </div>
            ) : (
              optionalPlans.map((block, idx) => renderTaskCard(block, idx, "optional"))
            )}
          </div>
        </div>

      </div>
    </div>
  );

  // Render card helper
  function renderTaskCard(block, index, category) {
    return (
      <div 
        key={block.id}
        style={{
          background: block.completed ? "rgba(127,186,0,0.03)" : "rgba(0,0,0,0.2)",
          border: block.completed ? "1px solid rgba(127,186,0,0.15)" : "1px solid rgba(255,255,255,0.03)",
          borderRadius: "6px",
          padding: "0.6rem",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          transition: "all 0.2s"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "0.7rem", 
              color: block.completed ? "var(--text-muted)" : "var(--accent)",
              fontWeight: 600,
              textDecoration: block.completed ? "line-through" : "none"
            }}>
              {block.start} - {block.end}
            </span>
            <h4 style={{ 
              fontSize: "0.85rem", 
              fontWeight: 700, 
              color: block.completed ? "var(--text-muted)" : "#fff",
              textDecoration: block.completed ? "line-through" : "none",
              marginTop: "2px"
            }}>
              {block.label}
            </h4>
          </div>

          <div style={{ display: "flex", gap: "0.2rem" }}>
            {/* Start Timer Play icon */}
            {!block.completed && selectedDate === new Date().toISOString().split("T")[0] && (
              <button 
                onClick={() => startTimerForBlock(block)} 
                style={{ background: "transparent", color: "var(--accent)" }}
                title="Launch focus Pomodoro"
              >
                <Play size={12} />
              </button>
            )}
            {/* Complete toggle checkbox */}
            <button 
              onClick={() => toggleBlockCompleted(block.id)}
              style={{ background: "transparent", padding: 0 }}
            >
              <Check size={14} style={{ color: block.completed ? "var(--accent)" : "rgba(255,255,255,0.15)" }} />
            </button>
          </div>
        </div>

        {block.desc && (
          <p style={{ 
            fontSize: "0.75rem", 
            color: block.completed ? "var(--text-muted)" : "var(--text-secondary)",
            textDecoration: block.completed ? "line-through" : "none"
          }}>
            {block.desc}
          </p>
        )}

        {/* Position & Category Shifter buttons */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          borderTop: "1px solid rgba(255,255,255,0.02)",
          paddingTop: "4px",
          marginTop: "4px"
        }}>
          {/* Shifting categories Must <-> Should <-> Optional */}
          <div style={{ display: "flex", gap: "4px" }}>
            <button 
              onClick={() => shiftCategory(block.id, "prev")}
              style={{ background: "transparent", padding: 0, color: "var(--text-muted)" }}
              disabled={category === "must"}
              title="Shift Category Left"
            >
              <ArrowLeft size={10} style={{ opacity: category === "must" ? 0.2 : 0.7 }} />
            </button>
            <span style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Shift Tier</span>
            <button 
              onClick={() => shiftCategory(block.id, "next")}
              style={{ background: "transparent", padding: 0, color: "var(--text-muted)" }}
              disabled={category === "optional"}
              title="Shift Category Right"
            >
              <ArrowRight size={10} style={{ opacity: category === "optional" ? 0.2 : 0.7 }} />
            </button>
          </div>

          {/* Reordering index */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={() => reorderBlock(index, "up", category)}
              style={{ background: "transparent", padding: 0, color: "var(--text-muted)" }}
              title="Move Up"
            >
              <ArrowUp size={10} />
            </button>
            <button 
              onClick={() => reorderBlock(index, "down", category)}
              style={{ background: "transparent", padding: 0, color: "var(--text-muted)" }}
              title="Move Down"
            >
              <ArrowDown size={10} />
            </button>
            <button onClick={() => startEdit(block)} style={{ background: "transparent", padding: 0, color: "var(--text-muted)", marginLeft: "4px" }} title="Edit">
              <Edit2 size={10} />
            </button>
            <button onClick={() => deleteBlock(block.id)} style={{ background: "transparent", padding: 0, color: "rgba(239, 68, 68, 0.4)" }} title="Delete">
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      </div>
    );
  }
}