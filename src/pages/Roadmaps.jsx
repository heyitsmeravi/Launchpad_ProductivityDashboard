import { useState } from "react";
import { useApp } from "../context/AppContext";
import * as XLSX from "xlsx";
import { Upload, FileText, CheckCircle2, Trash2, Plus, ArrowRight, BookOpen, Layers } from "lucide-react";

export default function Roadmaps() {
  const { roadmaps, setRoadmaps } = useApp();

  const [selectedRoadmapIdx, setSelectedRoadmapIdx] = useState(0);
  
  // Local state for manual roadmap creation
  const [manualName, setManualName] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  
  // Local state to add task to active roadmap
  const [newTaskText, setNewTaskText] = useState("");

  const activeRoadmap = roadmaps[selectedRoadmapIdx] || roadmaps[0];

  // --- XLSX / CSV File Upload Handler ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Read as array of rows
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length <= 1) {
          alert("Spreadsheet does not contain enough rows!");
          return;
        }

        // Parse rows. Skip headers (index 0)
        const tasks = data.map((row, idx) => {
          if (idx === 0) return null; // Skip header
          
          // Get first cell text
          const cellValue = row[0];
          if (cellValue === undefined || cellValue === null) return null;
          
          const text = String(cellValue).trim();
          if (!text) return null;

          return {
            id: `rt-uploaded-${Date.now()}-${idx}-${Math.random().toString().split(".")[1]}`,
            text: text,
            completed: false
          };
        }).filter(Boolean);

        if (tasks.length === 0) {
          alert("Could not parse any tasks from sheet! Make sure column 1 has text.");
          return;
        }

        const newRoadmap = {
          id: "rm-upload-" + Date.now(),
          name: file.name.replace(/\.[^/.]+$/, ""), // File name without extension
          source: "upload",
          tasks: tasks
        };

        setRoadmaps(prev => [...prev, newRoadmap]);
        setSelectedRoadmapIdx(roadmaps.length); // Set to new roadmap
        alert(`Successfully imported "${newRoadmap.name}" with ${tasks.length} tasks!`);
      } catch (err) {
        console.error("Error reading spreadsheet: ", err);
        alert("Failed to parse file. Ensure it is a valid .xlsx or .csv file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // Reset input file picker
  };

  // --- Create Manual Roadmap ---
  const handleCreateManualRoadmap = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const newRoadmap = {
      id: "rm-manual-" + Date.now(),
      name: manualName.trim(),
      source: "manual",
      tasks: []
    };

    setRoadmaps(prev => [...prev, newRoadmap]);
    setSelectedRoadmapIdx(roadmaps.length);
    setManualName("");
    setShowManualForm(false);
  };

  // --- Delete Roadmap ---
  const deleteRoadmap = (id) => {
    if (roadmaps.length <= 1) {
      alert("You must keep at least one roadmap catalog!");
      return;
    }
    if (window.confirm("Are you sure you want to delete this roadmap? All checklist tasks will be lost.")) {
      setRoadmaps(prev => prev.filter(r => r.id !== id));
      setSelectedRoadmapIdx(0);
    }
  };

  // --- Add Task to Active Roadmap ---
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !activeRoadmap) return;

    const newTask = {
      id: "rt-task-" + Date.now(),
      text: newTaskText.trim(),
      completed: false
    };

    setRoadmaps(prev => prev.map(r => {
      if (r.id === activeRoadmap.id) {
        return {
          ...r,
          tasks: [...r.tasks, newTask]
        };
      }
      return r;
    }));
    setNewTaskText("");
  };

  // --- Toggle Task Completed ---
  const toggleTaskCompleted = (roadmapId, taskId) => {
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

  // --- Delete Task from Active Roadmap ---
  const deleteTask = (roadmapId, taskId) => {
    setRoadmaps(prev => prev.map(r => {
      if (r.id === roadmapId) {
        return {
          ...r,
          tasks: r.tasks.filter(t => t.id !== taskId)
        };
      }
      return r;
    }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Roadmap Import & Syllabus Dashboard</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Import DSA problem sheets, system design plans, or custom goals from Excel (.xlsx) / CSV.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {/* Hidden File Input */}
          <label className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
            <Upload size={14} />
            <span>Upload XLSX / CSV</span>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={() => setShowManualForm(!showManualForm)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Plus size={14} />
            <span>Manual List</span>
          </button>
        </div>
      </div>

      {/* Manual Creation Form */}
      {showManualForm && (
        <form onSubmit={handleCreateManualRoadmap} className="glass-card" style={{ display: "flex", gap: "0.5rem", borderLeft: "4px solid var(--accent)", maxWidth: "500px" }}>
          <input 
            type="text" 
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="e.g. System Design Syllabus"
            required
            style={{ fontSize: "0.8rem" }}
          />
          <button type="submit" className="btn-primary">Create</button>
          <button type="button" onClick={() => setShowManualForm(false)} className="btn-secondary">Cancel</button>
        </form>
      )}

      {/* Layout Grid: Left list of roadmaps, Right syllabus contents */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Left pane: catalog list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="glass-card" style={{ padding: "0.75rem" }}>
            <div className="glass-card-header" style={{ marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "0.8rem" }}>Syllabus Catalogs</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {roadmaps.map((rm, idx) => {
                const isSelected = activeRoadmap?.id === rm.id;
                const rmTasks = rm.tasks || [];
                const completed = rmTasks.filter(t => t.completed).length;
                const percent = rmTasks.length > 0 ? Math.round((completed / rmTasks.length) * 100) : 0;
                
                return (
                  <div 
                    key={rm.id}
                    onClick={() => setSelectedRoadmapIdx(idx)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      background: isSelected ? "rgba(var(--accent-rgb), 0.08)" : "transparent",
                      border: isSelected ? "1px solid rgba(var(--accent-rgb), 0.25)" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontWeight: 600, fontSize: "0.8rem" }}>
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "160px" }}>
                        {rm.name}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: isSelected ? "var(--accent)" : "var(--text-muted)" }}>{percent}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--text-secondary)" }}>
                      <span style={{ textTransform: "capitalize" }}>{rm.source} roadmap</span>
                      <span>{completed}/{rmTasks.length} items</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {activeRoadmap ? (() => {
          const activeTasks = activeRoadmap.tasks || [];
          return (
            <div className="glass-card">
              <div className="glass-card-header" style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <h3>{activeRoadmap.name}</h3>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    Source: {activeRoadmap.source.toUpperCase()} &bull; Total: {activeTasks.length} items
                  </span>
                </div>
                <button 
                  onClick={() => deleteRoadmap(activeRoadmap.id)}
                  style={{ background: "transparent", color: "rgba(239, 68, 68, 0.4)" }}
                  title="Delete Roadmap Catalog"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Quick add manual task to active roadmap */}
              <form onSubmit={handleAddTask} style={{ display: "flex", gap: "0.4rem", margin: "1rem 0" }}>
                <input 
                  type="text" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Log a new roadmap task item (e.g. Design cache architecture)..."
                  required
                  style={{ fontSize: "0.8rem", padding: "0.45rem" }}
                />
                <button type="submit" className="btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}>Add Task</button>
              </form>

              {/* List of Tasks */}
              {activeTasks.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Catalog is empty. Upload spreadsheets or add tasks above!
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "0.5rem"
                }}>
                  {activeTasks.map((task) => (
                    <div 
                      key={task.id}
                      style={{
                        background: "rgba(0, 0, 0, 0.15)",
                        border: "1px solid rgba(255,255,255,0.02)",
                        borderRadius: "6px",
                        padding: "0.5rem 0.75rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem"
                      }}
                    >
                      <label className={`custom-checkbox ${task.completed ? "checked" : ""}`} style={{ flex: 1, padding: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={task.completed}
                          onChange={() => toggleTaskCompleted(activeRoadmap.id, task.id)}
                        />
                        <div className="checkbox-box" style={{ width: 12, height: 12 }}></div>
                        <span style={{ fontSize: "0.75rem", textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "var(--text-muted)" : "var(--text-primary)" }}>
                          {task.text}
                        </span>
                      </label>

                      <button 
                        onClick={() => deleteTask(activeRoadmap.id, task.id)}
                        style={{ background: "transparent", color: "rgba(239, 68, 68, 0.2)" }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })() : (
          <div className="glass-card" style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
            Please upload or create a roadmap checklist to get started.
          </div>
        )}

      </div>
    </div>
  );
}
