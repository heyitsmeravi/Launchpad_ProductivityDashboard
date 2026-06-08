import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Search, ExternalLink, Trash2, Award, Filter, Flame, Calendar, CheckSquare, Layers } from "lucide-react";

export default function DSA() {
  const { dsaProblems, setDsaProblems, roadmaps, setRoadmaps, settings } = useApp();
  const pillarName = settings?.pillar1Name || "Problem";

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProblem, setNewProblem] = useState({
    title: "",
    link: "",
    difficulty: "easy",
    category: "Arrays & Strings",
    notes: ""
  });

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  
  // Selected DSA roadmap list
  const [selectedRoadmapIdx, setSelectedRoadmapIdx] = useState(0);

  const activeRoadmap = roadmaps.filter(r => r.name.toLowerCase().includes("dsa") || r.name.toLowerCase().includes("blind") || r.source === "preset")[selectedRoadmapIdx] 
    || roadmaps[0];

  const handleAddProblem = (e) => {
    e.preventDefault();
    if (!newProblem.title.trim()) return;

    const problem = {
      id: "prob-" + Date.now(),
      title: newProblem.title.trim(),
      link: newProblem.link.trim() || "https://leetcode.com",
      difficulty: newProblem.difficulty,
      category: newProblem.category,
      notes: newProblem.notes.trim(),
      solvedAt: new Date().toISOString().split("T")[0]
    };

    setDsaProblems(prev => [problem, ...prev]);
    setNewProblem({
      title: "",
      link: "",
      difficulty: "easy",
      category: "Arrays & Strings",
      notes: ""
    });
    setShowAddForm(false);
  };

  const handleDeleteProblem = (id) => {
    if (window.confirm("Are you sure you want to delete this problem log?")) {
      setDsaProblems(prev => prev.filter(p => p.id !== id));
    }
  };

  // Toggle tasks on imported roadmaps
  const toggleRoadmapTask = (roadmapId, taskId) => {
    setRoadmaps(prev => prev.map(r => {
      if (r.id === roadmapId) {
        return {
          ...r,
          tasks: r.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }
      return r;
    }));
  };

  // --- Calculate Solve Streak ---
  const calculateStreak = () => {
    let streak = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Set of dates where at least one problem was solved
    const solvedDates = new Set(dsaProblems.map(p => p.solvedAt));
    
    let checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (solvedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Allow streak to remain active if we are checking today and they haven't solved today yet
        if (dateStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  const solveStreak = calculateStreak();

  // --- Solve Heatmap Data (Last 28 Days) ---
  const getHeatmapData = () => {
    const data = [];
    const today = new Date();
    const solvedDates = dsaProblems.map(p => p.solvedAt);
    
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = solvedDates.filter(date => date === dateStr).length;

      data.push({
        date: dateStr,
        dayNum: d.getDate(),
        count: count
      });
    }
    return data;
  };

  const heatmapDays = getHeatmapData();

  // Statistics
  const totalSolved = dsaProblems.length;
  const easyCount = dsaProblems.filter(p => p.difficulty === "easy").length;
  const mediumCount = dsaProblems.filter(p => p.difficulty === "medium").length;
  const hardCount = dsaProblems.filter(p => p.difficulty === "hard").length;

  const filteredProblems = dsaProblems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDifficulty = filterDifficulty === "all" || p.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const getDiffColor = (diff) => {
    if (diff === "easy") return "#7fba00";
    if (diff === "medium") return "#ffb900";
    return "#f25022";
  };

  const dsaRoadmapsList = roadmaps.filter(r => r.name.toLowerCase().includes("roadmap") || r.name.toLowerCase().includes("blind") || r.source === "preset");

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>{pillarName} Solver</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Log solved problems, track consecutive streaks, and execute uploaded roadmap worksheets.
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Plus size={14} />
            <span>Log Solve</span>
          </button>
        </div>
      </div>

      {/* Row of stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem" }}>
        {/* Streak */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "0.75rem", borderRadius: "10px" }} className={solveStreak > 0 ? "animate-pulse" : ""}>
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Solve Streak</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{solveStreak} Days</div>
          </div>
        </div>

        {/* Breakdown counters */}
        <div className="glass-card" style={{ display: "flex", gap: "0.5rem", justifyContent: "space-around", gridColumn: "span 2", padding: "0.75rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff" }}>{totalSolved}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Solved</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#7fba00" }}>{easyCount}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Easy</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#ffb900" }}>{mediumCount}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Medium</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#f25022" }}>{hardCount}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Hard</div>
          </div>
        </div>
      </div>

      {/* Log Problem Form */}
      {showAddForm && (
        <form onSubmit={handleAddProblem} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--accent)" }}>
          <div className="glass-card-header">
            <h3>Log Solved LeetCode / Platform Problem</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Problem Name</label>
              <input 
                type="text" 
                value={newProblem.title}
                onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
                placeholder="e.g. 3Sum"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Difficulty</label>
              <select 
                value={newProblem.difficulty}
                onChange={(e) => setNewProblem({ ...newProblem, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Category Tag</label>
              <select 
                value={newProblem.category}
                onChange={(e) => setNewProblem({ ...newProblem, category: e.target.value })}
              >
                <option value="Arrays & Strings">Arrays & Strings</option>
                <option value="Linked List">Linked List</option>
                <option value="Stack & Queue">Stack & Queue</option>
                <option value="Trees & BST">Trees & BST</option>
                <option value="Graphs">Graphs</option>
                <option value="Hashing">Hashing</option>
                <option value="Recursion">Recursion</option>
                <option value="Backtracking">Backtracking</option>
                <option value="Dynamic Programming">Dynamic Programming</option>
                <option value="Greedy Algorithms">Greedy Algorithms</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>LeetCode Link</label>
              <input 
                type="url" 
                value={newProblem.link}
                onChange={(e) => setNewProblem({ ...newProblem, link: e.target.value })}
                placeholder="https://leetcode.com/problems/..."
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Key Takeaway notes</label>
              <input 
                type="text" 
                value={newProblem.notes}
                onChange={(e) => setNewProblem({ ...newProblem, notes: e.target.value })}
                placeholder="Used 3 pointers, O(N^2) complexity"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Log Solve</button>
          </div>
        </form>
      )}

      {/* Grid: Solved Problems Log (Left), Synced Roadmap checklist (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Left pane: solved list & filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Solved Heatmap */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>
                <Calendar size={14} style={{ color: "var(--accent)", marginRight: "4px" }} />
                <span>{pillarName} Solves Heatmap (Last 28 Days)</span>
              </h3>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", maxWidth: "250px", width: "100%" }}>
                {heatmapDays.map(day => (
                  <div
                    key={day.date}
                    style={{
                      aspectRatio: "1/1",
                      borderRadius: "3px",
                      background: day.count > 0 ? "rgba(var(--accent-rgb), 0.3)" : "rgba(255,255,255,0.02)",
                      border: day.count > 0 ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                    title={`${day.date}: Solved ${day.count} problems`}
                  >
                    <span style={{ fontSize: "0.55rem", fontWeight: "bold", opacity: day.count > 0 ? 0.9 : 0.2 }}>
                      {day.dayNum}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0 }}>
            <div style={{ display: "flex", padding: "0.75rem", gap: "0.5rem", alignItems: "center", borderBottom: "1px solid var(--card-border)" }}>
              <Search size={14} style={{ color: "var(--text-secondary)" }} />
              <input 
                type="text" 
                placeholder="Search solved logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: "transparent", border: "none", padding: 0 }}
              />
              <select 
                value={filterDifficulty} 
                onChange={(e) => setFilterDifficulty(e.target.value)}
                style={{ width: "auto", fontSize: "0.75rem", padding: "2px 4px" }}
              >
                <option value="all">All Diff</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {filteredProblems.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No solved problems logged yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filteredProblems.map((prob, idx) => (
                  <div 
                    key={prob.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0.75rem",
                      borderBottom: idx === filteredProblems.length - 1 ? "none" : "1px solid rgba(255,255,255,0.02)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>{prob.title}</span>
                        {prob.link && (
                          <a href={prob.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{prob.category} &bull; {prob.notes}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.65rem", color: getDiffColor(prob.difficulty), fontWeight: "bold", textTransform: "uppercase" }}>
                        {prob.difficulty}
                      </span>
                      <button onClick={() => handleDeleteProblem(prob.id)} style={{ background: "transparent", color: "rgba(239,68,68,0.3)" }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: roadmap checklist synced */}
        <div className="glass-card">
          <div className="glass-card-header" style={{ marginBottom: "0.5rem" }}>
            <h3>Synced Roadmap Syllabus</h3>
            {dsaRoadmapsList.length > 0 && (
              <select 
                value={selectedRoadmapIdx}
                onChange={(e) => setSelectedRoadmapIdx(parseInt(e.target.value, 10))}
                style={{ width: "auto", fontSize: "0.75rem", padding: "2px" }}
              >
                {dsaRoadmapsList.map((rm, idx) => (
                  <option key={rm.id} value={idx}>{rm.name}</option>
                ))}
              </select>
            )}
          </div>

          {activeRoadmap ? (() => {
            const roadmapTasks = activeRoadmap.tasks || [];
            const completedCount = roadmapTasks.filter(t => t.completed).length;
            const progressPct = roadmapTasks.length > 0 ? Math.round((completedCount / roadmapTasks.length) * 100) : 0;
            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  <span>Roadmap Progress</span>
                  <span>
                    {completedCount} / {roadmapTasks.length} Done ({progressPct}%)
                  </span>
                </div>
                <div className="milestone-bar-bg" style={{ height: "3px", marginBottom: "0.75rem" }}>
                  <div 
                    className="milestone-bar-fill" 
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>

                {roadmapTasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    This roadmap is empty. Go to Roadmaps tab to upload sheet!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                    {roadmapTasks.map(task => (
                      <label key={task.id} className={`custom-checkbox ${task.completed ? "checked" : ""}`} style={{ padding: "4px 6px", alignItems: "center", background: "rgba(0,0,0,0.15)", borderRadius: "4px" }}>
                        <input 
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleRoadmapTask(activeRoadmap.id, task.id)}
                        />
                        <div className="checkbox-box" style={{ width: 12, height: 12 }}></div>
                        <span style={{ fontSize: "0.75rem", textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "var(--text-muted)" : "var(--text-primary)" }}>
                          {task.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })() : (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              No {pillarName} sheets synced. Go to Roadmaps tab to import an XLSX list!
            </div>
          )}
        </div>

      </div>
    </div>
  );
}