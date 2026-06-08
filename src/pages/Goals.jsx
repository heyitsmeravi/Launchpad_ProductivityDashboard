import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Trash2, Award, Calendar, CheckSquare, Target, Edit2 } from "lucide-react";

export default function Goals() {
  const { goals, setGoals, tracks } = useApp();
  
  // Active tab filter: long-term, monthly, weekly, daily
  const [activeTab, setActiveTab] = useState("long-term");

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    category: "long-term",
    deadline: "",
    trackId: ""
  });

  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;

    const goal = {
      id: "goal-" + Date.now(),
      title: newGoal.title.trim(),
      category: newGoal.category,
      deadline: newGoal.deadline || new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
      completed: false,
      trackId: newGoal.trackId
    };

    setGoals(prev => [...prev, goal]);
    setNewGoal({
      title: "",
      category: newGoal.category, // keep current category as default
      deadline: "",
      trackId: ""
    });
    setShowAddForm(false);
  };

  const deleteGoal = (id) => {
    if (window.confirm("Are you sure you want to delete this goal?")) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  const toggleGoalCompleted = (id) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  // Grouping
  const filteredGoals = goals.filter(g => g.category === activeTab);

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "long-term": return "#f25022"; // Red
      case "monthly": return "#ffb900"; // Yellow
      case "weekly": return "#a855f7"; // Purple
      default: return "var(--accent)"; // Blue/Cyan
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Objective & Goals System</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Track your major career milestones across multiple time horizons and link them directly to outcomes tracks.
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Plus size={14} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.75rem" }}>
        {[
          { id: "long-term", label: "🎯 Long Term Vision" },
          { id: "monthly", label: "📅 Monthly Objectives" },
          { id: "weekly", label: "⚡ Weekly Targets" },
          { id: "daily", label: "📝 Daily Milestones" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setNewGoal(prev => ({ ...prev, category: tab.id }));
            }}
            className="btn-secondary"
            style={{
              background: activeTab === tab.id ? `${getCategoryColor(tab.id)}15` : "rgba(255,255,255,0.03)",
              borderColor: activeTab === tab.id ? getCategoryColor(tab.id) : "var(--card-border)",
              color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
              padding: "0.4rem 1rem",
              fontSize: "0.85rem"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showAddForm && (
        <form onSubmit={handleCreateGoal} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: `4px solid ${getCategoryColor(newGoal.category)}` }}>
          <div className="glass-card-header">
            <h3>Create Objective Card</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Goal Description</label>
              <input 
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g. Build dynamic portfolios navbar component"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Target Horizon</label>
              <select value={newGoal.category} onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}>
                <option value="long-term">Long Term Goal</option>
                <option value="monthly">Monthly Goal</option>
                <option value="weekly">Weekly Goal</option>
                <option value="daily">Daily Goal</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Target Date</label>
              <input 
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Attach to Outcomes Track</label>
            <select value={newGoal.trackId} onChange={(e) => setNewGoal({ ...newGoal, trackId: e.target.value })}>
              <option value="">-- No linked track (General Objective) --</option>
              {tracks.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.category.toUpperCase()})</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" style={{ background: getCategoryColor(newGoal.category) }}>Save Goal</button>
          </div>
        </form>
      )}

      {/* List layout */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
        {filteredGoals.length === 0 ? (
          <div className="glass-card" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No goals defined in this category. Click New Goal to add one.
          </div>
        ) : (
          filteredGoals.map((g) => {
            const linkedTrack = tracks.find(t => t.id === g.trackId);
            return (
              <div 
                key={g.id}
                className="glass-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderLeft: `3px solid ${g.completed ? "#7fba00" : getCategoryColor(g.category)}`,
                  background: g.completed ? "rgba(127,186,0,0.02)" : "rgba(0,0,0,0.15)",
                  padding: "0.75rem 1rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                  {/* Completion check */}
                  <button 
                    onClick={() => toggleGoalCompleted(g.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: g.completed ? "var(--accent)" : "rgba(255,255,255,0.15)" }}
                  >
                    <CheckSquare size={18} />
                  </button>

                  <div>
                    <h3 style={{ 
                      fontSize: "0.95rem", 
                      fontWeight: 700, 
                      color: g.completed ? "var(--text-muted)" : "#fff",
                      textDecoration: g.completed ? "line-through" : "none"
                    }}>
                      {g.title}
                    </h3>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "4px", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <Calendar size={10} />
                        Deadline: {g.deadline}
                      </span>
                      {linkedTrack && (
                        <span style={{ display: "flex", alignItems: "center", gap: "2px", color: "var(--accent)" }}>
                          <Target size={10} />
                          Track: {linkedTrack.title} ({linkedTrack.progress}/{linkedTrack.target} {linkedTrack.unit})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ 
                    fontSize: "0.65rem", 
                    textTransform: "uppercase", 
                    fontWeight: "bold",
                    color: g.completed ? "#7fba00" : getCategoryColor(g.category),
                    background: g.completed ? "rgba(127,186,0,0.1)" : `${getCategoryColor(g.category)}12`,
                    border: `1px solid ${g.completed ? "rgba(127,186,0,0.2)" : `${getCategoryColor(g.category)}20`}`,
                    padding: "2px 8px",
                    borderRadius: "4px"
                  }}>
                    {g.completed ? "Completed" : g.category}
                  </span>
                  <button 
                    onClick={() => deleteGoal(g.id)}
                    style={{ background: "transparent", color: "rgba(239, 68, 68, 0.4)" }}
                    title="Remove Goal"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
