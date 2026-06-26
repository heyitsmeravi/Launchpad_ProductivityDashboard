import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, FolderGit2, Trash2, ArrowLeft, ArrowRight, ExternalLink, Edit2, Check, Clock, Calendar, CheckSquare } from "lucide-react";

const generateMilestoneId = () => "m-add-" + Date.now();

export default function Projects() {
  const { projects, setProjects } = useApp();

  // Local Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    desc: "",
    tech: "React",
    link: "",
    priority: "medium",
    deadline: "",
    hoursInvested: 0,
    rawMilestones: "" // Newline separated tasks
  });

  // Edit project state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    desc: "", 
    tech: "", 
    link: "",
    priority: "medium",
    deadline: "",
    hoursInvested: 0
  });

  // Manage milestones state inside edit mode
  const [newMilestoneText, setNewMilestoneText] = useState("");

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    // Parse raw milestones
    const milestones = newProject.rawMilestones
      .split("\n")
      .map(m => m.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `m-manual-${Date.now()}-${idx}`,
        text: text,
        checked: false
      }));

    const project = {
      id: "proj-" + Date.now(),
      name: newProject.name.trim(),
      desc: newProject.desc.trim(),
      tech: newProject.tech.trim(),
      link: newProject.link.trim(),
      priority: newProject.priority,
      deadline: newProject.deadline || new Date().toLocaleDateString("en-CA"),
      hoursInvested: parseInt(newProject.hoursInvested, 10) || 0,
      milestones: milestones,
      status: "idea"
    };

    setProjects(prev => [...prev, project]);
    setNewProject({
      name: "",
      desc: "",
      tech: "React",
      link: "",
      priority: "medium",
      deadline: "",
      hoursInvested: 0,
      rawMilestones: ""
    });
    setShowAddForm(false);
  };

  const moveProjectStatus = (id, currentStatus, direction) => {
    let nextStatus = currentStatus;
    if (direction === "forward") {
      if (currentStatus === "idea") nextStatus = "doing";
      else if (currentStatus === "doing") nextStatus = "done";
    } else if (direction === "backward") {
      if (currentStatus === "done") nextStatus = "doing";
      else if (currentStatus === "doing") nextStatus = "idea";
    }

    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
  };

  const startEditing = (project) => {
    setEditingId(project.id);
    setEditForm({ ...project });
  };

  const saveEditing = (id) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...editForm } : p));
    setEditingId(null);
  };

  const deleteProject = (id) => {
    if (window.confirm("Are you sure you want to delete this project card?")) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  // Toggle milestone checked
  const toggleMilestone = (projectId, milestoneId) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          milestones: (p.milestones || []).map(m => m.id === milestoneId ? { ...m, checked: !m.checked } : m)
        };
      }
      return p;
    }));
  };

  // Add milestone to active editing project
  const addMilestoneToProject = (projectId) => {
    if (!newMilestoneText.trim()) return;
    const newM = {
      id: generateMilestoneId(),
      text: newMilestoneText.trim(),
      checked: false
    };

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          milestones: [...(p.milestones || []), newM]
        };
      }
      return p;
    }));
    setNewMilestoneText("");
  };

  // Delete milestone from project
  const deleteMilestone = (projectId, milestoneId) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          milestones: (p.milestones || []).filter(m => m.id !== milestoneId)
        };
      }
      return p;
    }));
  };

  // Group columns
  const columns = {
    idea: { title: "Idea / Backlog", items: projects.filter(p => p.status === "idea"), color: "#94a3b8" },
    doing: { title: "Building / In Progress", items: projects.filter(p => p.status === "doing"), color: "var(--accent)" },
    done: { title: "Deployed / Finished", items: projects.filter(p => p.status === "done"), color: "#7fba00" }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Project Portfolio Kanban Board</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Track priority, deadline dates, logged hours, and checklist milestones across your builds.
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Plus size={14} />
          <span>Add Project Idea</span>
        </button>
      </div>

      {/* Add Project Card Form */}
      {showAddForm && (
        <form onSubmit={handleCreateProject} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--accent)" }}>
          <div className="glass-card-header">
            <h3>Configure Project Kanban Card</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Project Name</label>
              <input 
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g. AI Chatbot Assistant"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Tech Stack</label>
              <input 
                type="text"
                value={newProject.tech}
                onChange={(e) => setNewProject({ ...newProject, tech: e.target.value })}
                placeholder="e.g. React, Express, LLM"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Priority Level</label>
              <select 
                value={newProject.priority}
                onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Target Deadline Date</label>
              <input 
                type="date"
                value={newProject.deadline}
                onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Hours Invested Initially</label>
              <input 
                type="number"
                value={newProject.hoursInvested}
                onChange={(e) => setNewProject({ ...newProject, hoursInvested: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>GitHub / Demo URL</label>
              <input 
                type="url"
                value={newProject.link}
                onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                placeholder="https://github.com"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Milestone Task Items (One task per line)</label>
            <textarea 
              value={newProject.rawMilestones}
              onChange={(e) => setNewProject({ ...newProject, rawMilestones: e.target.value })}
              placeholder="e.g.&#10;Design database schemas&#10;Write REST API routers&#10;Configure Dark/Light themes"
              style={{ height: "90px", resize: "none", fontSize: "0.8rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Kanban Card</button>
          </div>
        </form>
      )}

      {/* Columns Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: "1.5rem",
        alignItems: "start"
      }}>
        {Object.entries(columns).map(([colKey, col]) => (
          <div 
            key={colKey}
            className="glass-card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              minHeight: "550px",
              borderTop: `3px solid ${col.color}`,
              background: "rgba(9, 15, 36, 0.45)"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FolderGit2 size={14} style={{ color: col.color }} />
                <span>{col.title}</span>
              </h3>
              <span style={{ fontSize: "0.75rem", background: "rgba(255, 255, 255, 0.05)", padding: "2px 8px", borderRadius: "10px", color: col.color, fontWeight: "bold" }}>
                {col.items.length}
              </span>
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", overflowY: "auto", maxHeight: "650px", paddingRight: "4px" }}>
              {col.items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)", fontSize: "0.8rem", border: "1px dashed rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  Column is empty
                </div>
              ) : (
                col.items.map(proj => {
                  const isEditing = editingId === proj.id;
                  const milestones = proj.milestones || [];
                  const priority = proj.priority || "medium";
                  const hoursInvested = proj.hoursInvested || 0;
                  const deadline = proj.deadline || "No deadline";
                  
                  // Compute completed milestones
                  const totalM = milestones.length;
                  const completedM = milestones.filter(m => m.checked).length;
                  const progressPct = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0;

                  return (
                    <div 
                      key={proj.id}
                      style={{
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }}
                    >
                      {isEditing ? (
                        // Edit card details
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <input 
                            type="text" 
                            value={editForm.name} 
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={{ fontSize: "0.8rem", padding: "4px" }}
                            placeholder="Name"
                          />
                          <input 
                            type="text" 
                            value={editForm.tech} 
                            onChange={(e) => setEditForm({ ...editForm, tech: e.target.value })}
                            style={{ fontSize: "0.75rem", padding: "4px" }}
                            placeholder="Tech stack"
                          />
                          <input 
                            type="text" 
                            value={editForm.desc} 
                            onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })}
                            style={{ fontSize: "0.75rem", padding: "4px" }}
                            placeholder="Description"
                          />
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                            <div>
                              <label style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Priority</label>
                              <select 
                                value={editForm.priority}
                                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                                style={{ fontSize: "0.7rem", padding: "2px" }}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Hours Invested</label>
                              <input 
                                type="number" 
                                value={editForm.hoursInvested}
                                onChange={(e) => setEditForm({ ...editForm, hoursInvested: parseInt(e.target.value, 10) || 0 })}
                                style={{ fontSize: "0.7rem", padding: "4px" }}
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                            <div>
                              <label style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Deadline</label>
                              <input 
                                type="date" 
                                value={editForm.deadline}
                                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                style={{ fontSize: "0.7rem", padding: "4px" }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>GitHub URL</label>
                              <input 
                                type="text" 
                                value={editForm.link}
                                onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                                style={{ fontSize: "0.7rem", padding: "4px" }}
                              />
                            </div>
                          </div>

                          {/* Milestones editor inside editing card */}
                          <div style={{ marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "4px" }}>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Edit Milestones</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                              {milestones.map(m => (
                                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.15)", padding: "2px 4px", borderRadius: "3px" }}>
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{m.text}</span>
                                  <button type="button" onClick={() => deleteMilestone(proj.id, m.id)} style={{ background: "transparent", color: "#ef4444" }}>
                                    <Trash2 size={8} />
                                  </button>
                                </div>
                              ))}
                              <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                                <input 
                                  type="text" 
                                  value={newMilestoneText}
                                  onChange={(e) => setNewMilestoneText(e.target.value)}
                                  placeholder="Add milestone"
                                  style={{ fontSize: "0.7rem", padding: "2px" }}
                                />
                                <button type="button" onClick={() => addMilestoneToProject(proj.id)} className="btn-primary" style={{ padding: "2px 6px", fontSize: "0.7rem" }}>Add</button>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => saveEditing(proj.id)} 
                            className="btn-primary"
                            style={{ alignSelf: "flex-end", padding: "2px 8px", fontSize: "0.75rem", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <Check size={12} /> Save Card
                          </button>
                        </div>
                      ) : (
                        // View Card details
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{proj.name}</h4>
                            <div style={{ display: "flex", gap: "0.25rem" }}>
                              <button onClick={() => startEditing(proj)} style={{ background: "transparent", color: "var(--text-muted)" }}>
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => deleteProject(proj.id)} style={{ background: "transparent", color: "rgba(239, 68, 68, 0.4)" }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>{proj.desc}</p>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontFamily: "var(--font-mono)", background: "rgba(var(--accent-rgb), 0.05)", padding: "1px 6px", borderRadius: "4px", border: "1px solid rgba(var(--accent-rgb), 0.1)" }}>
                              {proj.tech}
                            </span>
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background: priority === "high" ? "rgba(242,80,34,0.15)" : "rgba(255,255,255,0.03)",
                              color: priority === "high" ? "#f25022" : "var(--text-secondary)",
                              padding: "1px 6px",
                              borderRadius: "4px"
                            }}>
                              {priority} Priority
                            </span>
                          </div>

                          {/* Hours invested and deadline info */}
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Clock size={10} style={{ color: "var(--accent)" }} />
                              <span>{hoursInvested} Hrs Invested</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Calendar size={10} style={{ color: "var(--accent)" }} />
                              <span>Due: {deadline}</span>
                            </div>
                          </div>

                          {proj.link && (
                            <a 
                              href={proj.link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--text-secondary)", textDecoration: "none", marginTop: "2px" }}
                            >
                              <ExternalLink size={10} />
                              <span>GitHub / Repository</span>
                            </a>
                          )}

                           {/* Milestones checklist list */}
                          {milestones.length > 0 && (
                            <div style={{
                              borderTop: "1px solid rgba(255,255,255,0.03)",
                              paddingTop: "0.5rem",
                              marginTop: "0.25rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                  <CheckSquare size={10} style={{ color: "var(--accent)" }} />
                                  <span>Milestones</span>
                                </span>
                                <span>{progressPct}%</span>
                              </div>
                              <div className="milestone-bar-bg" style={{ height: "3px", marginBottom: "4px" }}>
                                <div className="milestone-bar-fill" style={{ width: `${progressPct}%` }}></div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "100px", overflowY: "auto" }}>
                                {milestones.map(m => (
                                  <label key={m.id} className={`custom-checkbox ${m.checked ? "checked" : ""}`} style={{ padding: "1px 2px", alignItems: "center" }}>
                                    <input 
                                      type="checkbox" 
                                      checked={m.checked}
                                      onChange={() => toggleMilestone(proj.id, m.id)}
                                    />
                                    <div className="checkbox-box" style={{ width: 10, height: 10, border: "1px solid var(--text-muted)" }}></div>
                                    <span style={{ fontSize: "0.68rem", textDecoration: m.checked ? "line-through" : "none", color: m.checked ? "var(--text-muted)" : "var(--text-primary)" }}>
                                      {m.text}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Columns Actions */}
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                            <button 
                              onClick={() => moveProjectStatus(proj.id, proj.status, "backward")} 
                              disabled={colKey === "idea"}
                              style={{ opacity: colKey === "idea" ? 0.2 : 0.8, background: "transparent", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "2px", fontSize: "0.7rem" }}
                            >
                              <ArrowLeft size={10} /> Back
                            </button>
                            <button 
                              onClick={() => moveProjectStatus(proj.id, proj.status, "forward")} 
                              disabled={colKey === "done"}
                              style={{ opacity: colKey === "done" ? 0.2 : 0.8, background: "transparent", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "2px", fontSize: "0.7rem" }}
                            >
                              Forward <ArrowRight size={10} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}