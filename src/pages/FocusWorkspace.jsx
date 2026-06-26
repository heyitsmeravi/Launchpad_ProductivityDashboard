import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Sparkles,
  ChevronLeft
} from "lucide-react";

export default function FocusWorkspace() {
  const {
    activeFocusSession,
    recoverySession,
    tracks,
    timerSeconds,
    timerIsRunning,
    setTimerIsRunning,
    timerMode,
    timerConfig,
    timerOverrideLimit,
    finishFocusSessionEarly,
    cancelFocusSession,
    setNotifications
  } = useApp();

  const navigate = useNavigate();

  // Route Guard Redirect if no active or recoverable session exists
  useEffect(() => {
    if (!activeFocusSession && !recoverySession) {
      setNotifications(prev => [
        {
          id: `notif-${Date.now()}`,
          tag: "Focus Mode",
          text: "No active focus session found. Select a mission from the Dashboard to start.",
          type: "info"
        },
        ...prev
      ]);
      navigate("/");
    }
  }, [activeFocusSession, recoverySession, navigate, setNotifications]);

  if (!activeFocusSession) {
    return null; // Will redirect or let RecoveryManager handle it
  }

  // Parse task information
  const taskId = activeFocusSession.taskId;
  let trackTitle = "General Study";
  let lessonTitle = "Study Session";
  let link = "";
  let category = "learning";

  if (taskId && taskId.startsWith("plan-")) {
    const sourceId = taskId.replace("plan-", "");
    if (sourceId.includes("::")) {
      const [trackId, itemId] = sourceId.split("::");
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        trackTitle = track.title;
        category = track.category || "learning";
        const lesson = track.tasks?.find(item => item.id === itemId);
        if (lesson) {
          lessonTitle = lesson.title || lesson.text;
          link = lesson.link || "";
        }
      }
    }
  }

  // Define outcome coaching messages based on status/signals
  let expectedImpact = "Finish this module today.";
  let selectionReason = "Selected to keep up your learning velocity and momentum.";

  if (category === "dsa") {
    expectedImpact = "Stay ahead of your deadline.";
    selectionReason = "Selected to reinforce problem-solving speed under time constraints.";
  } else if (category === "project") {
    expectedImpact = "Clear an overdue revision.";
    selectionReason = "Selected to help push progress on engineering project milestones.";
  }

  // Timer Calculations
  const limit = timerOverrideLimit !== null ? timerOverrideLimit : (timerConfig[timerMode] || 25 * 60);
  const timeRemaining = Math.max(0, limit - timerSeconds);
  const remainingMins = Math.floor(timeRemaining / 60);
  const remainingSecs = timeRemaining % 60;
  
  const circleRadius = 75;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - timeRemaining / limit);

  const handleOpenLink = () => {
    if (link) {
      window.open(link, "_blank");
    }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel this focus session? progress will be discarded.")) {
      cancelFocusSession();
      navigate("/");
    }
  };

  const handleComplete = () => {
    finishFocusSessionEarly();
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "85vh",
      padding: "2rem",
      background: "radial-gradient(circle at center, rgba(var(--accent-rgb), 0.05) 0%, rgba(0,0,0,0) 70%)",
      color: "#fff",
      position: "relative",
    
    }}>
      {/* Back button to return to dashboard safely */}
      <button 
        onClick={handleCancel}
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 500
        }}
      >
        <ChevronLeft size={16} />
        <span>Exit Focus</span>
      </button>

      {/* Main Glass Workspace Frame */}
      <div className="glass-card" style={{
        maxWidth: "600px",
        width: "100%",
        padding: "2.5rem",
        textAlign: "center",
        boxShadow: "0 12px 40px 0 rgba(0, 0, 0, 0.4)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        overflow: "auto",
        height: "100%",
      }}>
        
        {/* Workspace Title Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--accent)" }}>
            <Sparkles size={18} />
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold" }}>Focus Workspace Active</span>
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: "4px 0" }}>{lessonTitle}</h2>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Track: <strong style={{ color: "#fff" }}>{trackTitle}</strong>
          </div>
        </div>

        {/* Circular Countdown Timer */}
        <div style={{ display: "flex", justifyContent: "center", margin: "1rem 0" }}>
          <div style={{ width: 200, height: 200, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }} viewBox="0 0 180 180">
              <circle cx="90" cy="90" r={circleRadius} style={{ fill: "none", stroke: "rgba(255,255,255,0.05)", strokeWidth: 6 }} />
              <circle
                cx="90"
                cy="90"
                r={circleRadius}
                style={{
                  fill: "none",
                  stroke: "var(--accent)",
                  strokeWidth: 6,
                  strokeLinecap: "round",
                  transition: "stroke-dashoffset 0.35s",
                  filter: "drop-shadow(0px 0px 4px rgba(var(--accent-rgb), 0.5))"
                }}
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>
                {remainingMins.toString().padStart(2, "0")}:{remainingSecs.toString().padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "1px" }}>
                {timerIsRunning ? "Deep Studying" : "Session Paused"}
              </div>
            </div>
          </div>
        </div>

        {/* Action button to open external links */}
        {link && (
          <div>
            <button 
              onClick={handleOpenLink}
              className="btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "0.8rem 1.8rem",
                fontSize: "0.95rem",
                fontWeight: "bold",
                margin: "0 auto",
                boxShadow: "0 4px 12px 0 rgba(var(--accent-rgb), 0.25)"
              }}
            >
              <ExternalLink size={16} />
              <span>Open Learning Material</span>
            </button>
          </div>
        )}

        {/* Coaching Insight Panel */}
        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "10px",
          padding: "1rem 1.2rem",
          textAlign: "left",
          fontSize: "0.85rem",
          lineHeight: "1.5",
          color: "var(--text-secondary)"
        }}>
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "var(--accent)", textTransform: "uppercase", fontSize: "0.7rem", display: "block", letterSpacing: "0.5px" }}>Why this lesson:</strong>
            {selectionReason}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
            <strong style={{ color: "#a855f7", textTransform: "uppercase", fontSize: "0.7rem", display: "block", letterSpacing: "0.5px" }}>Expected learning impact:</strong>
            {expectedImpact}
          </div>
        </div>

        {/* Controls row */}
        <div style={{ 
          display: "flex", 
          gap: "1rem", 
          marginTop: "0.5rem", 
          justifyContent: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          paddingTop: "1.5rem"
        }}>
          
          <button 
            onClick={() => setTimerIsRunning(!timerIsRunning)}
            className="btn-secondary"
            style={{
              flex: 1,
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "0.9rem",
              fontWeight: "bold",
              borderColor: "rgba(255, 255, 255, 0.15)"
            }}
          >
            {timerIsRunning ? (
              <>
                <Pause size={16} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Resume</span>
              </>
            )}
          </button>

          <button 
            onClick={handleComplete}
            className="btn-primary"
            style={{
              flex: 1,
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "0.9rem",
              fontWeight: "bold",
              background: "var(--ms-green)",
              borderColor: "var(--ms-green)"
            }}
          >
            <CheckCircle size={16} />
            <span>Complete Session</span>
          </button>

          <button 
            onClick={handleCancel}
            className="btn-secondary"
            style={{
              flex: "0 0 50px",
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderColor: "rgba(255, 68, 68, 0.25)",
              color: "#ff4444"
            }}
            title="Cancel Session"
          >
            <XCircle size={18} />
          </button>

        </div>

      </div>
    </div>
  );
}
