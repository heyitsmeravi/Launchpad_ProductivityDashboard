import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RotateCcw, Trash2 } from "lucide-react";

export default function FocusRecoveryManager() {
  const { recoverySession, resumeFocusSession, discardFocusSession } = useApp();
  const navigate = useNavigate();

  if (!recoverySession) return null;

  const handleResume = () => {
    resumeFocusSession();
    navigate("/focus");
  };

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard this interrupted focus session? Progress in this session will be lost.")) {
      discardFocusSession();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center", display: "flex", flexDirection: "column", gap: "1.2rem", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)" }}>
          <AlertCircle size={48} />
        </div>
        <div>
          <h3 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>Session Recovery</h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            Resume previous focus session?
            <br />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", display: "inline-block" }}>
              We detected a study session that was interrupted by a browser close or reload.
            </span>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.5rem" }}>
          <button 
            onClick={handleResume}
            className="btn-primary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <RotateCcw size={16} />
            <span>Resume Session</span>
          </button>
          <button 
            onClick={handleDiscard}
            className="btn-secondary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(255, 68, 68, 0.1)", color: "#ff4444", borderColor: "rgba(255, 68, 68, 0.2)" }}
          >
            <Trash2 size={16} />
            <span>Discard Progress</span>
          </button>
        </div>
      </div>
    </div>
  );
}
