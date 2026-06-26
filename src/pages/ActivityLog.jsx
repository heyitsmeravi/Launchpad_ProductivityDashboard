import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Trash2, Calendar, Clock, Star } from "lucide-react";

export default function ActivityLog() {
  const { activityLogs, setActivityLogs, tracks, setTracks } = useApp();
  
  // Local Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    date: new Date().toLocaleDateString("en-CA"),
    desc: "",
    trackId: "",
    progressIncrement: 1,
    durationMinutes: 90,
    quality: 4
  });

  const handleLogActivity = (e) => {
    e.preventDefault();
    if (!newActivity.desc.trim()) return;

    const actId = "act-" + Date.now();
    const duration = parseInt(newActivity.durationMinutes, 10) || 0;
    const increment = parseInt(newActivity.progressIncrement, 10) || 0;
    const quality = parseInt(newActivity.quality, 10) || 4;

    const activityEntry = {
      id: actId,
      date: newActivity.date,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      desc: newActivity.desc.trim(),
      trackId: newActivity.trackId,
      progressIncrement: increment,
      durationMinutes: duration,
      quality: quality
    };

    // 1. Save activity
    setActivityLogs(prev => [activityEntry, ...prev]);

    // 2. Automatically increment track progress if trackId is selected
    if (newActivity.trackId) {
      setTracks(prevTracks => prevTracks.map(t => {
        if (t.id === newActivity.trackId) {
          const nextProgress = Math.min(t.target, t.progress + increment);
          return {
            ...t,
            progress: nextProgress,
            status: nextProgress >= t.target ? "completed" : t.status
          };
        }
        return t;
      }));
    }

    // Reset form
    setNewActivity({
      date: new Date().toLocaleDateString("en-CA"),
      desc: "",
      trackId: "",
      progressIncrement: 1,
      durationMinutes: 90,
      quality: 4
    });
    setShowAddForm(false);
    alert("Outcome activity logged successfully! Track progress updated.");
  };

  const handleDeleteActivity = (act) => {
    if (window.confirm(`Delete this log entry? Attached track progress will be adjusted by -${act.progressIncrement || 0}.`)) {
      // 1. Remove activity log
      setActivityLogs(prev => prev.filter(a => a.id !== act.id));

      // 2. Adjust track progress back
      if (act.trackId && act.progressIncrement) {
        setTracks(prevTracks => prevTracks.map(t => {
          if (t.id === act.trackId) {
            const nextProgress = Math.max(0, t.progress - act.progressIncrement);
            return {
              ...t,
              progress: nextProgress,
              status: nextProgress >= t.target ? "completed" : "learning"
            };
          }
          return t;
        }));
      }
    }
  };

  const sortedActivities = [...activityLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Daily Learning Feed</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            A timeline of your actual completed outcomes, learning insights, and invested time.
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Plus size={14} />
          <span>Log Outcome</span>
        </button>
      </div>

      {/* Form */}
      {showAddForm && (
        <form onSubmit={handleLogActivity} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--accent)" }}>
          <div className="glass-card-header">
            <h3>Log Concrete Work Outcome</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Outcome Description (What did you complete?)</label>
              <input 
                type="text"
                value={newActivity.desc}
                onChange={(e) => setNewActivity({ ...newActivity, desc: e.target.value })}
                placeholder="e.g. Solved 3 Linked List problems / Built header component layout"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Date Completed</label>
              <input 
                type="date"
                value={newActivity.date}
                onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Session Quality</label>
              <select value={newActivity.quality} onChange={(e) => setNewActivity({ ...newActivity, quality: e.target.value })}>
                <option value="5">⭐⭐⭐⭐⭐ Outstanding Focus (5)</option>
                <option value="4">⭐⭐⭐⭐ High Output (4)</option>
                <option value="3">⭐⭐⭐ Standard Output (3)</option>
                <option value="2">⭐⭐ Minimal Output (2)</option>
                <option value="1">⭐ Highly Distracted (1)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Attach to Syllabus Track</label>
              <select value={newActivity.trackId} onChange={(e) => setNewActivity({ ...newActivity, trackId: e.target.value })}>
                <option value="">-- No linked track (General Session) --</option>
                {tracks.filter(t => t.status === "learning").map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.category.toUpperCase()})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Increment Progress count</label>
              <input 
                type="number"
                value={newActivity.progressIncrement}
                onChange={(e) => setNewActivity({ ...newActivity, progressIncrement: e.target.value })}
                min="0"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Duration (Minutes)</label>
              <input 
                type="number"
                value={newActivity.durationMinutes}
                onChange={(e) => setNewActivity({ ...newActivity, durationMinutes: e.target.value })}
                min="1"
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Record Log</button>
          </div>
        </form>
      )}

      {/* Timeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
        {sortedActivities.length === 0 ? (
          <div className="glass-card" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No logged outcomes yet. Click Log Outcome to record your completed goals.
          </div>
        ) : (
          sortedActivities.map((act) => {
            const track = tracks.find(t => t.id === act.trackId);
            return (
              <div 
                key={act.id} 
                className="glass-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  borderLeft: `3px solid ${act.durationMinutes >= 120 ? "var(--accent)" : "rgba(255,255,255,0.06)"}`
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.25rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Calendar size={12} style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 800, color: "#fff" }}>
                      {act.date} {act.time ? `@ ${act.time}` : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                      <Clock size={12} />
                      {act.durationMinutes} mins
                    </span>
                    <span>Rating: <strong style={{ color: "#ffb900" }}>{"⭐".repeat(act.quality)}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    <p style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 600 }}>{act.desc}</p>
                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      <span>Track: <strong>{track ? track.title : "General"}</strong></span>
                      {act.progressIncrement > 0 && (
                        <span>Auto-Incremented progress by: <strong>+{act.progressIncrement} {track?.unit || ""}</strong></span>
                      )}
                    </div>
                    
                    {/* Rich Metadata Rendering */}
                    {(act.confidence > 0 || act.keyTakeaway || act.notes || act.reflection) && (
                      <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                        {act.confidence > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Confidence</span>
                            <div style={{ display: "flex" }}>
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} size={12} fill={star <= act.confidence ? "#ffb900" : "none"} color={star <= act.confidence ? "#ffb900" : "var(--text-muted)"} />
                              ))}
                            </div>
                          </div>
                        )}
                        {act.keyTakeaway && (
                          <div style={{ fontSize: "0.8rem", color: "#fff" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--accent)", textTransform: "uppercase", marginRight: "0.5rem" }}>Key Takeaway</span>
                            {act.keyTakeaway}
                          </div>
                        )}
                        {act.notes && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                            "{act.notes}"
                          </div>
                        )}
                        {act.reflection && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                            "{act.reflection}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleDeleteActivity(act)}
                    style={{ background: "transparent", color: "rgba(239, 68, 68, 0.4)" }}
                    title="Delete log"
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
