import { useEffect, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Star, ShieldCheck, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function GlobalTimerCompletion() {
  const {
    activeFocusSession,
    pendingFocusCheck,
    showSummaryModal,
    answerFocusCheck,
    saveFocusSession,
    cancelFocusSession,
    tracks
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [reflectionText, setReflectionText] = useState("");
  const [planConfidence, setPlanConfidence] = useState(0);
  const [planKeyTakeaway, setPlanKeyTakeaway] = useState("");

  // Custom adjustment states
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [customVerifiedMins, setCustomVerifiedMins] = useState(0);
  const [remainderType, setRemainderType] = useState("break");

  // Reset fields when the summary modal opens
  useEffect(() => {
    if (showSummaryModal) {
      setTimeout(() => {
        setReflectionText("");
        setPlanConfidence(0);
        setPlanKeyTakeaway("");
      }, 0);
    }
  }, [showSummaryModal]);

  // Reset custom adjustment state when check changes
  useEffect(() => {
    if (pendingFocusCheck) {
      setTimeout(() => {
        setIsAdjusting(false);
        const mins = Math.floor(pendingFocusCheck.elapsedSeconds / 60);
        setCustomVerifiedMins(mins);
        setRemainderType("break");
      }, 0);
    }
  }, [pendingFocusCheck]);

  const handleSaveAdjustment = useCallback(() => {
    if (!pendingFocusCheck) return;
    const elapsedSecs = pendingFocusCheck.elapsedSeconds;
    const verifiedSecs = Math.min(elapsedSecs, customVerifiedMins * 60);
    const remainderSecs = elapsedSecs - verifiedSecs;
    
    answerFocusCheck("custom", {
      verified: verifiedSecs,
      distracted: remainderType === "distracted" ? remainderSecs : 0,
      breakTime: remainderType === "break" ? remainderSecs : 0
    });
    
    setIsAdjusting(false);
  }, [pendingFocusCheck, customVerifiedMins, remainderType, answerFocusCheck]);

  // Keyboard shortcuts when the verification popup is active
  useEffect(() => {
    if (!pendingFocusCheck) return;

    const handleKeyDown = (e) => {
      if (isAdjusting) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSaveAdjustment();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsAdjusting(false);
        }
      } else {
        if (e.key === "Enter") {
          e.preventDefault();
          answerFocusCheck("working");
        } else if (e.key === "Escape") {
          e.preventDefault();
          answerFocusCheck("break");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingFocusCheck, answerFocusCheck, isAdjusting, handleSaveAdjustment]);

  const getTaskInfo = (taskId) => {
    if (!taskId) return null;
    if (taskId.startsWith("perm-")) {
      const key = taskId.replace("perm-", "");
      return { id: taskId, type: "permanent", title: key.toUpperCase() + " Target" };
    }
    if (taskId.startsWith("plan-")) {
      const sourceId = taskId.replace("plan-", "");
      return { id: taskId, type: "plan", title: "Track Task", sourceId };
    }
    return { id: taskId, type: "goal", title: "Goal" };
  };

  const getTaskTitle = (task) => {
    if (!task) return "Generic Focus Session";
    if (task.type === "plan" && task.sourceId && task.sourceId.includes("::")) {
      const [trackId, itemId] = task.sourceId.split("::");
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const item = track.tasks?.find(i => i.id === itemId);
        if (item) return item.title || item.text;
      }
    }
    return task.title;
  };

  const formatSeconds = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  const totalElapsed = activeFocusSession?.totalElapsedSeconds || 0;
  const verified = activeFocusSession?.verifiedSeconds || 0;
  const distracted = activeFocusSession?.distractedSeconds || 0;
  const breaks = activeFocusSession?.breakSeconds || 0;

  const score = Math.round((verified / (verified + distracted || 1)) * 100);
  const taskInfo = activeFocusSession ? getTaskInfo(activeFocusSession.taskId) : null;
  const taskTitle = taskInfo ? getTaskTitle(taskInfo) : "Generic Focus Session";

  const handleSaveSession = () => {
    saveFocusSession(reflectionText, planConfidence, planKeyTakeaway, reflectionText);
    if (location.pathname === "/focus") {
      navigate("/");
    }
  };

  const handleDiscardSession = () => {
    if (window.confirm("Are you sure you want to discard this session's focus data? All verified time will be cleared from this session.")) {
      cancelFocusSession();
      if (location.pathname === "/focus") {
        navigate("/");
      }
    }
  };

  return (
    <>
      {/* Focus Verification Check Modal */}
      {pendingFocusCheck && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center", display: "flex", flexDirection: "column", gap: "1.2rem", border: "1px solid rgba(255,255,255,0.1)" }}>
            {!isAdjusting ? (
              <>
                <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)" }}>
                  <ShieldCheck size={48} />
                </div>
                <div>
                  <h3 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>Focus Verification Check</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Are you still actively working on <strong style={{ color: "#fff" }}>{taskTitle}</strong>?
                    <br />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "inline-block" }}>
                      Checking a block of {Math.floor(pendingFocusCheck.elapsedSeconds / 60)}m
                    </span>
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.5rem" }}>
                  <button 
                    onClick={() => answerFocusCheck("working")}
                    className="btn-primary"
                    style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
                  >
                    Yes, I'm Working
                  </button>
                  <button 
                    onClick={() => answerFocusCheck("distracted")}
                    className="btn-secondary"
                    style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem", background: "rgba(255, 68, 68, 0.15)", color: "#ff4444", borderColor: "rgba(255, 68, 68, 0.3)" }}
                  >
                    No, I Got Distracted
                  </button>
                  <button 
                    onClick={() => answerFocusCheck("break")}
                    className="btn-secondary"
                    style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
                  >
                    On a Valid Break
                  </button>
                  
                  {Math.floor(pendingFocusCheck.elapsedSeconds / 60) >= 1 && (
                    <button 
                      onClick={() => setIsAdjusting(true)}
                      className="btn-secondary"
                      style={{ border: "none", background: "none", textDecoration: "underline", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer", padding: 0, marginTop: "0.3rem" }}
                    >
                      Adjust minutes...
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)" }}>
                  <Zap size={36} />
                </div>
                <div>
                  <h3 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>Adjust Block Time</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    Select how many minutes of the last <strong style={{ color: "#fff" }}>{Math.floor(pendingFocusCheck.elapsedSeconds / 60)}m</strong> you actually spent working.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem", textAlign: "left" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Minutes Focused:</span>
                      <strong style={{ color: "var(--accent)" }}>{customVerifiedMins}m</strong>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max={Math.floor(pendingFocusCheck.elapsedSeconds / 60)}
                      value={customVerifiedMins}
                      onChange={e => setCustomVerifiedMins(parseInt(e.target.value, 10))}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>

                  {customVerifiedMins < Math.floor(pendingFocusCheck.elapsedSeconds / 60) && (
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                        Categorize the remaining {Math.floor(pendingFocusCheck.elapsedSeconds / 60) - customVerifiedMins}m as:
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setRemainderType("break")}
                          className="btn-secondary"
                          style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", background: remainderType === "break" ? "rgba(var(--accent-rgb), 0.15)" : "none", borderColor: remainderType === "break" ? "var(--accent)" : "rgba(255,255,255,0.1)", color: remainderType === "break" ? "var(--accent)" : "var(--text-secondary)" }}
                        >
                          Valid Break
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemainderType("distracted")}
                          className="btn-secondary"
                          style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", background: remainderType === "distracted" ? "rgba(255,68,68,0.15)" : "none", borderColor: remainderType === "distracted" ? "#ff4444" : "rgba(255,255,255,0.1)", color: remainderType === "distracted" ? "#ff4444" : "var(--text-secondary)" }}
                        >
                          Distracted
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button 
                    onClick={handleSaveAdjustment}
                    className="btn-primary"
                    style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem" }}
                  >
                    Confirm Adjust
                  </button>
                  <button 
                    onClick={() => setIsAdjusting(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem" }}
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Focus Session Summary Modal */}
      {showSummaryModal && activeFocusSession && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: "500px", display: "flex", flexDirection: "column", gap: "1.2rem", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: "0.5rem" }}>
                <Zap size={36} />
              </div>
              <h3 style={{ color: "var(--accent)", marginBottom: "0.2rem" }}>Focus Session Completed</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Task: <span style={{ color: "#fff", fontWeight: "bold" }}>{taskTitle}</span>
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>Total Elapsed</span>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fff" }}>
                  {formatSeconds(totalElapsed)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>Verified Focus</span>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#7fba00" }}>
                  {formatSeconds(verified)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>Distracted Time</span>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#ff4444" }}>
                  {formatSeconds(distracted)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>Break Time</span>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--accent)" }}>
                  {formatSeconds(breaks)}
                </div>
              </div>
            </div>

            {/* Focus Score */}
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Focus Score</span>
              <div style={{ fontSize: "2rem", fontWeight: "900", color: score >= 80 ? "#7fba00" : score >= 50 ? "#ffb900" : "#ff4444", marginTop: "2px" }}>
                {score}%
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "4px", height: "8px", overflow: "hidden", marginTop: "6px" }}>
                <div style={{ 
                  width: `${score}%`, 
                  background: score >= 80 ? "#7fba00" : score >= 50 ? "#ffb900" : "#ff4444", 
                  height: "100%", 
                  borderRadius: "4px" 
                }}></div>
              </div>
            </div>

            {/* General Reflection */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                Reflection / Accomplishments
              </label>
              <textarea 
                value={reflectionText}
                onChange={e => setReflectionText(e.target.value)}
                placeholder="What did you get done during this session?"
                style={{ width: "100%", height: "60px", padding: "8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", resize: "none", fontSize: "0.85rem", lineHeight: "1.4" }}
              />
            </div>

            {/* Plan-specific checklist if relevant */}
            {taskInfo?.type === "plan" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.8rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Confidence Score (1-5)</label>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPlanConfidence(star)}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                      >
                        <Star fill={star <= planConfidence ? "#ffb900" : "none"} color={star <= planConfidence ? "#ffb900" : "var(--text-muted)"} size={24} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Key Takeaway</label>
                  <input 
                    type="text" 
                    value={planKeyTakeaway}
                    onChange={e => setPlanKeyTakeaway(e.target.value)}
                    placeholder="What's the main concept you want to remember?"
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem" }}>
              <button 
                onClick={handleSaveSession}
                className="btn-primary" 
                style={{ flex: 1, padding: "0.7rem" }}
              >
                Save Focus Log
              </button>
              <button 
                onClick={handleDiscardSession}
                className="btn-secondary" 
                style={{ border: "1px solid #ff4444", color: "#ff4444", padding: "0.7rem" }}
              >
                Discard Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
