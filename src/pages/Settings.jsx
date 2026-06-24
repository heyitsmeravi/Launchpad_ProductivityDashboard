import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Settings as SettingsIcon, Save, RefreshCw, Trash2, ShieldAlert, Check } from "lucide-react";

export default function Settings() {
  const { 
    settings, 
    setSettings,
    PRESETS,
    presetMode,
  } = useApp();

  // Form states
  const [targetName, setTargetName] = useState(settings.targetCompany || "Microsoft");
  const [targetSlogan, setTargetSlogan] = useState(settings.targetCompany === "Microsoft" ? "WIN A GREAT INTERNSHIP → BUILD A CAREER AT MICROSOFT" : `SOLVE PROBLEMS → SUCCEED AT ${(settings.targetCompany || "Microsoft").toUpperCase()}`);
  const [targetColor, setTargetColor] = useState(settings.themeColor || "#00a2ed");
  const [oddEvenMode, setOddEvenMode] = useState(settings.oddEvenMode !== undefined ? settings.oddEvenMode : true);
  
  const [pillar1Input, setPillar1Input] = useState(settings.pillar1Name || "DSA Practice");
  const [pillar2Input, setPillar2Input] = useState(settings.pillar2Name || "Development");

  // Vacation Range states
  const [vacationStart, setVacationStart] = useState(settings.vacationStart || "");
  const [vacationEnd, setVacationEnd] = useState(settings.vacationEnd || "");

  // Permanent Goals Form states
  const [dsaGoal, setDsaGoal] = useState(settings.permanentGoals?.dsa !== undefined ? settings.permanentGoals.dsa : 3);
  const [devGoal, setDevGoal] = useState(settings.permanentGoals?.development !== undefined ? settings.permanentGoals.development : 2);
  const [learnGoal, setLearnGoal] = useState(settings.permanentGoals?.learning !== undefined ? settings.permanentGoals.learning : 2);
  const [readGoal, setReadGoal] = useState(settings.permanentGoals?.reading !== undefined ? settings.permanentGoals.reading : 10);
  const [exerciseGoal, setExerciseGoal] = useState(settings.permanentGoals?.exercise !== undefined ? settings.permanentGoals.exercise : 30);
  
  // Timer states
  const [focusMin, setFocusMin] = useState(PRESETS[presetMode]?.focus ? PRESETS[presetMode].focus / 60 : 25);
  const [shortMin, setShortMin] = useState(PRESETS[presetMode]?.shortBreak ? PRESETS[presetMode].shortBreak / 60 : 5);
  const [longMin, setLongMin] = useState(PRESETS[presetMode]?.longBreak ? PRESETS[presetMode].longBreak / 60 : 15);

  // Success indicator
  const [showSavedToast, setShowSavedToast] = useState(false);

  // AI settings state
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("lp_geminiApiKey") || "";
  });

  // Preset companies
  const presets = [
    { name: "Microsoft", color: "#00a2ed", slogan: "WIN A GREAT INTERNSHIP → BUILD A CAREER AT MICROSOFT" },
    { name: "Google", color: "#4285f4", slogan: "SOLVE MASSIVE PROBLEMS → LAUNCH A CAREER AT GOOGLE" },
    { name: "Meta", color: "#0081fb", slogan: "CONNECT THE WORLD → EXCEL AT META" },
    { name: "Netflix", color: "#e50914", slogan: "ENTERTAIN MILLIONS → CODE AT NETFLIX" },
    { name: "Custom / General", color: "#a855f7", slogan: "BUILD DREAMS → EXECUTE EVERY SINGLE DAY" }
  ];

  const applyPreset = (preset) => {
    setTargetName(preset.name);
    setTargetColor(preset.color);
    setTargetSlogan(preset.slogan);
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    // Save settings
    setSettings({
      themeColor: targetColor,
      targetCompany: targetName,
      pillar1Name: pillar1Input,
      pillar2Name: pillar2Input,
      oddEvenMode: oddEvenMode,
      vacationStart: vacationStart,
      vacationEnd: vacationEnd,
      permanentGoals: {
        dsa: parseFloat(dsaGoal) || 3,
        learning: parseFloat(learnGoal) || 2,
        development: parseFloat(devGoal) || 2,
        reading: parseInt(readGoal, 10) || 10,
        exercise: parseInt(exerciseGoal, 10) || 30
      }
    });

    // Save timer settings (convert minutes to seconds)
    const updatedPresets = { ...PRESETS };
    updatedPresets[presetMode] = {
      focus: parseFloat(focusMin) * 60 || 25 * 60,
      shortBreak: parseFloat(shortMin) * 60 || 5 * 60,
      longBreak: parseFloat(longMin) * 60 || 15 * 60
    };
    localStorage.setItem("timerPresets", JSON.stringify(updatedPresets)); 
    localStorage.setItem("lp_geminiApiKey", apiKey.trim());

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleResetData = () => {
    if (window.confirm("WARNING: This will delete all custom plans, goals, tracks, distraction logs, and focus sessions, resetting LaunchPad to defaults. Proceed?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>OS Workspace Configuration</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Tailor recommended splits, customize daily targets, configure vacation ranges, and manage timers.
          </p>
        </div>
      </div>

      {showSavedToast && (
        <div style={{
          background: "rgba(127, 186, 0, 0.15)",
          color: "#7fba00",
          border: "1px solid rgba(127, 186, 0, 0.3)",
          padding: "0.75rem 1.25rem",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          fontWeight: 600,
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          marginBottom: "1rem"
        }}>
          <Check size={16} />
          <span>OS Settings saved successfully! Configurations updated.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        
        {/* Main form */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Target Organization Presets */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Target Organization Presets</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.5rem" }}>
              {presets.map((p) => {
                const isActivePreset = targetName === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="btn-secondary"
                    style={{
                      borderColor: isActivePreset ? p.color : "var(--card-border)",
                      color: isActivePreset ? "#fff" : "var(--text-secondary)",
                      background: isActivePreset ? `${p.color}15` : "rgba(255,255,255,0.02)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem"
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }}></span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branding customize */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="glass-card-header">
              <h3>Branding & Theme Settings</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Target Organization Name</label>
                <input 
                  type="text" 
                  value={targetName}
                  onChange={(e) => {
                    setTargetName(e.target.value);
                    setTargetSlogan(e.target.value === "Microsoft" ? "WIN A GREAT INTERNSHIP → BUILD A CAREER AT MICROSOFT" : `SOLVE PROBLEMS → SUCCEED AT ${e.target.value.toUpperCase()}`);
                  }}
                  placeholder="Microsoft"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Theme Color (Hex Code)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input 
                    type="text" 
                    value={targetColor}
                    onChange={(e) => setTargetColor(e.target.value)}
                    placeholder="#00a2ed"
                    style={{ fontFamily: "var(--font-mono)" }}
                    required
                  />
                  <input 
                    type="color" 
                    value={targetColor} 
                    onChange={(e) => setTargetColor(e.target.value)}
                    style={{ width: "42px", height: "38px", padding: 0, cursor: "pointer", borderRadius: "6px" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Career Slogan</label>
                <input 
                  type="text" 
                  value={targetSlogan}
                  onChange={(e) => setTargetSlogan(e.target.value)}
                  placeholder="WIN A GREAT INTERNSHIP → BUILD A CAREER AT MICROSOFT"
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Primary Focus Pillar (e.g. DSA, Core Mechanics)</label>
                <input 
                  type="text" 
                  value={pillar1Input}
                  onChange={(e) => setPillar1Input(e.target.value)}
                  placeholder="DSA Practice"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Secondary Focus Pillar (e.g. Dev, CAD)</label>
                <input 
                  type="text" 
                  value={pillar2Input}
                  onChange={(e) => setPillar2Input(e.target.value)}
                  placeholder="Development"
                  required
                />
              </div>
            </div>

            {/* Odd-Even Mode checkbox */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.75rem", marginTop: "0.50rem" }}>
              <label className={`custom-checkbox ${oddEvenMode ? "checked" : ""}`}>
                <input 
                  type="checkbox" 
                  checked={oddEvenMode}
                  onChange={(e) => setOddEvenMode(e.target.checked)}
                />
                <div className="checkbox-box"></div>
                <div>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>Enable Odd-Even Mode (Adaptive recommendations)</span>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Odd Days recommendation: 70% {pillar1Input}, 30% {pillar2Input}. Even Days recommendation: 40% {pillar1Input}, 60% {pillar2Input}.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Vacation days picker */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="glass-card-header">
              <h3>Vacation Planning Configuration</h3>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Vacation Start Date</label>
                <input 
                  type="date"
                  value={vacationStart}
                  onChange={(e) => setVacationStart(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Vacation End Date</label>
                <input 
                  type="date"
                  value={vacationEnd}
                  onChange={(e) => setVacationEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Daily Permanent Goals */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="glass-card-header">
              <h3>Daily Permanent Targets</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>{pillar1Input} (Hours)</label>
                <input 
                  type="number"
                  step="0.5"
                  value={dsaGoal}
                  onChange={(e) => setDsaGoal(e.target.value)}
                  required
                  min="0"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>{pillar2Input} (Hours)</label>
                <input 
                  type="number"
                  step="0.5"
                  value={devGoal}
                  onChange={(e) => setDevGoal(e.target.value)}
                  required
                  min="0"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Learning (Hours)</label>
                <input 
                  type="number"
                  step="0.5"
                  value={learnGoal}
                  onChange={(e) => setLearnGoal(e.target.value)}
                  required
                  min="0"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Reading (Pages)</label>
                <input 
                  type="number"
                  value={readGoal}
                  onChange={(e) => setReadGoal(e.target.value)}
                  required
                  min="0"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Exercise (Minutes)</label>
                <input 
                  type="number"
                  value={exerciseGoal}
                  onChange={(e) => setExerciseGoal(e.target.value)}
                  required
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Pomodoro settings */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="glass-card-header">
              <h3>Pomodoro Constants (Minutes)</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Deep Focus Block</label>
                <input 
                  type="number"
                  value={focusMin}
                  onChange={(e) => setFocusMin(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Short Rest Block</label>
                <input 
                  type="number"
                  value={shortMin}
                  onChange={(e) => setShortMin(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Long Rest Block</label>
                <input 
                  type="number"
                  value={longMin}
                  onChange={(e) => setLongMin(e.target.value)}
                  min="1"
                  required
                />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="glass-card-header">
              <h3>AI Advisor Configuration</h3>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Gemini API Key
              </label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key (stored locally in your browser)"
                style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.9rem" }}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Don't have a key? You can get a free API key from Google AI Studio. Stored strictly in local memory.
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.5rem" }}>
              <Save size={16} />
              <span>Apply Config</span>
            </button>
          </div>
        </form>

        {/* Info panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Adaptive Split Info</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              <div>Odd-Even mode will dynamically scale daily recommended study targets on odd or even dates of the month to balance skills.</div>
              <div>Odd calendar days shift emphasis to **{pillar1Input}**, while even calendar days shift emphasis to **{pillar2Input}**.</div>
            </div>
          </div>

          <div className="glass-card" style={{ borderLeft: "4px solid var(--ms-red)" }}>
            <div className="glass-card-header" style={{ borderBottomColor: "rgba(242, 80, 34, 0.1)" }}>
              <h3 style={{ color: "var(--ms-red)" }}>
                <ShieldAlert size={14} />
                <span>Danger Zone</span>
              </h3>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4", marginBottom: "1rem" }}>
              Resetting deletes all catalog tracks, activity logs, distraction audits, planner templates, and goals in local memory.
            </p>
            <button 
              onClick={handleResetData}
              className="btn-secondary" 
              style={{
                width: "100%", 
                backgroundColor: "rgba(242, 80, 34, 0.08)", 
                borderColor: "rgba(242, 80, 34, 0.25)",
                color: "var(--ms-red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem"
              }}
            >
              <Trash2 size={12} />
              <span>Wipe OS Local Storage</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}