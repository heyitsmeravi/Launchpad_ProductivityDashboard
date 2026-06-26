import { useState } from "react";
import { useApp } from "../context/AppContext";
import { ArrowLeft, Clock, Star, AlertTriangle, PlayCircle } from "lucide-react";

export default function TrackDetail({ trackId, onBack }) {
  const { 
    tracks, 
    setTracks,
    currentFocusTask,
    setCurrentFocusTask,
    setTimerMode,
    setTimerIsRunning,
    activeFocusSession,
    setActiveFocusSession
  } = useApp();
  const track = tracks.find(t => t.id === trackId);
  const [filterStatus, setFilterStatus] = useState("all");

  if (!track) return null;

  const handleUpdateItem = (itemId, updates) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const updatedTasks = t.tasks.map(task => 
          task.id === itemId ? { ...task, ...updates } : task
        );
        
        // Recalculate track progress based on completed items
        const completedCount = updatedTasks.filter(task => 
          ["Completed", "Solved", "Mastered", "Applied", "Revised"].includes(task.status)
        ).length;
        
        return {
          ...t,
          tasks: updatedTasks,
          progress: t.category === "project" ? t.progress : completedCount // Project might use manual % or task count
        };
      }
      return t;
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": case "Solved": case "Applied": case "Mastered": return "var(--ms-green)";
      case "In Progress": case "Attempted": case "Watching": return "var(--ms-yellow)";
      case "Revised": return "var(--accent)";
      default: return "var(--text-muted)";
    }
  };

  const renderStars = (score, itemId) => {
    return (
      <div style={{ display: "flex", gap: "2px" }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => handleUpdateItem(itemId, { 
              confidence: star, 
              needsRevision: star <= 3 
            })}
            style={{ 
              background: "none", 
              border: "none", 
              color: star <= score ? "#ffb900" : "rgba(255,255,255,0.1)",
              cursor: "pointer",
              padding: 0
            }}
          >
            <Star fill={star <= score ? "#ffb900" : "none"} size={16} />
          </button>
        ))}
      </div>
    );
  };

  const getFilteredLessons = (lessons) => {
    return lessons.filter(lesson => {
      if (filterStatus === "all") return true;
      if (filterStatus === "needsRevision") return lesson.needsRevision;
      if (filterStatus === "completed") return lesson.completed;
      return true;
    });
  };

  const totalLessonsCount = track.modules ? track.modules.reduce((sum, m) => sum + (m.lessons ? m.lessons.length : 0), 0) : 0;
  const totalTime = track.tasks.reduce((sum, t) => sum + (t.timeSpentMins || 0), 0);
  const avgConfidence = track.tasks.length ? 
    (track.tasks.reduce((sum, t) => sum + (t.confidence || 0), 0) / track.tasks.length).toFixed(1) : 0;

  return (
    <div className="track-detail-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button onClick={onBack} className="btn-secondary" style={{ width: "fit-content", padding: "0.4rem 0.8rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <ArrowLeft size={14} /> Back to Tracks
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "1px", marginBottom: "0.25rem" }}>
              {track.category}
            </div>
            <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#fff" }}>{track.title}</h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
              {track.description || "No description provided."}
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", backgroundColor: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--card-border)" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Progress</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff" }}>
                {track.progress} / {track.target} {track.unit}
              </span>
            </div>
            <div style={{ width: "1px", background: "var(--card-border)" }}></div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Time Invested</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={16} color="var(--accent)" /> {Math.round(totalTime / 60)}h {totalTime % 60}m
              </span>
            </div>
            <div style={{ width: "1px", background: "var(--card-border)" }}></div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Avg Confidence</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
                <Star size={16} color="#ffb900" fill="#ffb900" /> {avgConfidence}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task List Section */}
      <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="glass-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Syllabus Items ({totalLessonsCount})</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "0.4rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--card-border)" }}
            >
              <option value="all">All Items</option>
              <option value="completed">Completed Only</option>
              <option value="needsRevision">Needs Revision</option>
            </select>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {!track.modules || track.modules.length === 0 || totalLessonsCount === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              No syllabus items found in this track.
            </div>
          ) : (
            track.modules.map(module => {
              const filteredLessons = getFilteredLessons(module.lessons || []);
              
              return (
                <div key={module.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Module Header */}
                  <div style={{ 
                    padding: "0.6rem 1rem", 
                    background: "rgba(255,255,255,0.03)", 
                    border: "1px solid var(--card-border)",
                    borderLeft: "4px solid var(--accent)", 
                    borderRadius: "6px", 
                    fontWeight: "bold", 
                    color: "#fff",
                    fontSize: "0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>{module.title}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "normal" }}>
                      {filteredLessons.length} {filteredLessons.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  {/* Lessons List */}
                  {filteredLessons.length === 0 ? (
                    <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", border: "1px dashed var(--card-border)", borderRadius: "8px", marginLeft: "1rem" }}>
                      No items match the filter in this module.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "1rem" }}>
                      {filteredLessons.map(lesson => (
                        <div key={lesson.id} style={{ 
                          background: "rgba(255,255,255,0.02)", 
                          border: "1px solid var(--card-border)", 
                          borderRadius: "8px", 
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                                {lesson.needsRevision && <AlertTriangle size={14} color="#ef4444" />}
                                <h4 style={{ margin: 0, fontSize: "0.95rem", color: lesson.completed ? "var(--text-muted)" : "#fff", textDecoration: lesson.completed ? "line-through" : "none" }}>
                                  {lesson.title}
                                </h4>
                                {!lesson.completed && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const focusTaskId = `plan-${track.id}::${lesson.id}`;
                                      setCurrentFocusTask(focusTaskId);
                                      setTimerMode("focus");
                                      setTimerIsRunning(true);
                                      if (activeFocusSession) {
                                        setActiveFocusSession(prev => prev ? { ...prev, taskId: focusTaskId } : null);
                                      }
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: currentFocusTask === `plan-${track.id}::${lesson.id}` ? "var(--accent)" : "rgba(255,255,255,0.4)",
                                      cursor: "pointer",
                                      padding: "2px",
                                      display: "flex",
                                      alignItems: "center"
                                    }}
                                    title="Start Focus Session"
                                  >
                                    <PlayCircle size={14} fill={currentFocusTask === `plan-${track.id}::${lesson.id}` ? "var(--accent)" : "none"} />
                                  </button>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)", alignItems: "center" }}>
                                <span style={{ color: getStatusColor(lesson.completed ? (track.category === "dsa" ? "Solved" : "Completed") : "Not Started"), fontWeight: "bold" }}>
                                  {lesson.completed ? (track.category === "dsa" ? "Solved" : "Completed") : "Not Started"}
                                </span>
                                {lesson.timeSpentMins > 0 && (
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Clock size={12} /> {lesson.timeSpentMins}m</span>
                                )}
                                {lesson.dateCompleted && (
                                  <span>Done: {lesson.dateCompleted}</span>
                                )}
                              </div>
                            </div>
                            <div>
                              {renderStars(lesson.confidence || 0, lesson.id)}
                            </div>
                          </div>

                          {/* Expandable Rich Data */}
                          <div style={{ display: "grid", gridTemplateColumns: track.category === "playlist" || track.category === "book" ? "1fr 1fr" : "1fr", gap: "1rem", marginTop: "0.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Notes</label>
                              <input 
                                type="text" 
                                value={lesson.notes || ""}
                                onChange={(e) => handleUpdateItem(lesson.id, { notes: e.target.value })}
                                placeholder="Add notes..."
                                style={{ fontSize: "0.8rem", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px dashed var(--card-border)", color: "#fff", borderRadius: "4px" }}
                              />
                            </div>
                            
                            {(track.category === "playlist" || track.category === "book") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Key Takeaway</label>
                                <input 
                                  type="text" 
                                  value={lesson.keyTakeaway || ""}
                                  onChange={(e) => handleUpdateItem(lesson.id, { keyTakeaway: e.target.value })}
                                  placeholder="What did you learn?"
                                  style={{ fontSize: "0.8rem", padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px dashed var(--card-border)", color: "#fff", borderRadius: "4px" }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
