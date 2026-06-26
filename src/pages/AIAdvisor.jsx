import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Sparkles, Brain, Clock, ShieldAlert, SendHorizontal, Trash2, RotateCw } from "lucide-react";

export default function AIAdvisor() {
  const { activityLogs, distractions, dailyReflections, settings, tracks } = useApp();

  const [apiKey, setApiKey] = useState(() => localStorage.getItem("lp_geminiApiKey") || "");
  const [reports, setReports] = useState(() => {
    try {
      const saved = localStorage.getItem("lp_ai_reports");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Chat States
  const [chatMessages, setChatMessages] = useState([
    { role: "model", text: "Hello! I am your AI SWE Coach. Ask me anything about your progress, DSA tracks, or study schedule." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("lp_ai_reports", JSON.stringify(reports));
  }, [reports]);

  // Sync API Key if updated in settings
  useEffect(() => {
    const handleStorageChange = () => {
      setApiKey(localStorage.getItem("lp_geminiApiKey") || "");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Disable main-content scroll on this page to prevent viewport cutting
  useEffect(() => {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      const prevOverflow = mainContent.style.overflow;
      mainContent.style.overflow = "hidden";
      return () => {
        mainContent.style.overflow = prevOverflow;
      };
    }
  }, []);

  // Helper to parse simple markdown to JSX safely
  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      // Headers
      if (line.startsWith("### ")) {
        return <h4 key={idx} style={{ margin: "1.2rem 0 0.5rem 0", color: "var(--accent)" }}>{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} style={{ margin: "1.5rem 0 0.75rem 0", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.25rem" }}>{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} style={{ margin: "1.5rem 0 1rem 0", color: "var(--accent)" }}>{line.replace("# ", "")}</h2>;
      }
      
      // Bullets
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.substring(2);
        return (
          <ul key={idx} style={{ margin: "0.25rem 0", paddingLeft: "1.5rem", color: "var(--text-secondary)" }}>
            <li>{parseInlineMarkdown(content)}</li>
          </ul>
        );
      }

      // Standard paragraphs
      if (line.trim() === "") return <div key={idx} style={{ height: "0.5rem" }} />;
      return <p key={idx} style={{ margin: "0.5rem 0", color: "var(--text-secondary)", lineHeight: "1.5", fontSize: "0.9rem" }}>{parseInlineMarkdown(line)}</p>;
    });
  };

  const parseInlineMarkdown = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} style={{ color: "#fff" }}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Compile user context to prompt Gemini
  const compileUserContext = () => {
    
    // 1. Compile recent activity logs
    const recentLogs = activityLogs.slice(0, 15).map(log => ({
      date: log.date,
      description: log.desc,
      duration: `${log.durationMinutes}m`,
      focusScore: log.focusScore ? `${log.focusScore}%` : "N/A",
      reflection: log.reflection || log.notes || ""
    }));

    // 2. Compile recent distractions
    const recentDistractions = distractions.slice(0, 10).map(d => ({
      date: d.date,
      source: d.source,
      severity: d.severity,
      duration: `${d.durationMinutes}m`
    }));

    // 3. Compile daily reflections
    const recentReflections = dailyReflections.slice(0, 5).map(r => ({
      date: r.date,
      whatWentWell: r.well,
      distractions: r.distracted,
      tomorrowPriority: r.tomorrow
    }));

    // 4. Compile syllabus progress overview
    const syllabusProgress = tracks.map(t => ({
      title: t.title,
      category: t.category,
      progress: `${t.progress}/${t.target} (${t.status})`
    }));

    return JSON.stringify({
      targetCompany: settings?.targetCompany || "Software Company",
      pillars: [settings?.pillar1Name || "DSA", settings?.pillar2Name || "Development"],
      syllabusProgress,
      recentLogs,
      recentDistractions,
      recentReflections
    }, null, 2);
  };

  const handleGenerateReport = async () => {
    if (!apiKey) {
      setError("Please set a valid Gemini API key in your Settings first.");
      return;
    }

    setLoading(true);
    setError(null);

    const userContext = compileUserContext();
    const systemPrompt = `You are a world-class SWE Performance Coach and technical mentor. 
Analyze the user's focus sessions, distraction audits, and learning reflections.
Provide a highly detailed, actionable performance review containing:
1. Focus Summary: Overview of their study hours, verified score, and overall momentum.
2. Strengths: What they are doing well based on their reflections and logs.
3. Areas of Improvement: Patterns of distractions (like TV, YouTube, social media) or low focus segments, and how to counter them.
4. Actionable Next Steps: 3 specific study schedule or checklist recommendations for tomorrow.
Keep the tone encouraging, structured, direct, and elite. Output in standard Markdown. Keep paragraphs concise.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${systemPrompt}\n\nHere is my study dashboard context:\n${userContext}` }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        let errMsg = `Status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error?.message) {
            errMsg = errData.error.message;
          }
        } catch {
          // Fall back to default error message if JSON parsing fails
        }
        throw new Error(`Gemini API Error: ${errMsg}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("No suggestion text received from Gemini API.");
      }

      const newReport = {
        id: `rep-${Date.now()}`,
        date: new Date().toLocaleDateString("en-CA"),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: generatedText
      };

      setReports(prev => [newReport, ...prev]);
    } catch (e) {
      setError(e.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    if (!apiKey) {
      alert("Please configure a Gemini API key in Settings to use the chat coach.");
      return;
    }

    const userMessageText = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMessageText }]);
    setChatLoading(true);

    const userContext = compileUserContext();
    const systemPrompt = `You are a helpful AI SWE Coach assisting the user. You have access to their study dashboard stats, logs, and goals. 
Give concise, direct, and encouraging advice. 
Here is their current context:\n${userContext}`;

    try {
      // Build conversation payload, skipping the initial greeting model message
      const chatHistory = chatMessages
        .filter((_, idx) => idx > 0)
        .map(msg => ({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.text }]
        }));

      // Append new message
      chatHistory.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessageText}` }]
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: chatHistory
          })
        }
      );

      if (!response.ok) {
        let errMsg = `Status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error?.message) {
            errMsg = errData.error.message;
          }
        } catch {
          // Fall back to default error message if JSON parsing fails
        }
        throw new Error(`Gemini API Error: ${errMsg}`);
      }

      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!replyText) {
        throw new Error("No response received from Gemini.");
      }

      setChatMessages(prev => [...prev, { role: "model", text: replyText }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "model", text: `Sorry, I ran into an error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDeleteReport = (reportId) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      setReports(prev => prev.filter(r => r.id !== reportId));
    }
  };

  return (
    <div className="page-container" style={{ height: "calc(100vh - 70px)", padding: "1.5rem 2rem", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden" }}>
      <div className="page-header">
        <div>
          <h2>AI Performance Coach</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Harness Gemini AI to perform audit logs, identify distraction patterns, and optimize your SWE goals.
          </p>
        </div>

        {apiKey && (
          <button 
            onClick={handleGenerateReport} 
            disabled={loading}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            {loading ? <RotateCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{loading ? "Analyzing logs..." : "Generate Focus Report"}</span>
          </button>
        )}
      </div>

      {!apiKey ? (
        <div className="glass-card" style={{ borderLeft: "4px solid var(--accent)", padding: "2.5rem", textAlign: "center" }}>
          <Brain size={48} color="var(--accent)" style={{ margin: "0 auto 1rem auto" }} />
          <h3>AI Coach is Deactivated</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "500px", margin: "0.5rem auto 1.5rem auto", lineHeight: "1.5" }}>
            To activate your personal coach, please add a **Gemini API Key** in your Settings.
            All API calls are performed directly from your browser to Google AI Studio. Your key never leaves your machine.
          </p>
          <a href="/settings" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
            Go to Settings
          </a>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gridTemplateRows: "1fr", gap: "1.5rem", height: "calc(100vh - 210px)", minHeight: 0 }}>
          
          {/* Left Column: Report Logs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", paddingRight: "0.5rem", height: "100%", minHeight: 0 }}>
            {error && (
              <div className="glass-card" style={{ borderLeft: "4px solid #ff4444", padding: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#ff4444", fontSize: "0.85rem" }}>
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            {reports.length === 0 ? (
              <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", color: "var(--text-secondary)", textAlign: "center" }}>
                <Sparkles size={36} color="var(--text-muted)" style={{ marginBottom: "0.75rem" }} />
                <h4>No reports generated yet</h4>
                <p style={{ fontSize: "0.85rem", maxWidth: "350px", marginTop: "4px", lineHeight: "1.4" }}>
                  Click "Generate Focus Report" at the top right to start your first Gemini log audit and get personalized SWE guidance.
                </p>
              </div>
            ) : (
              reports.map((rep) => (
                <div key={rep.id} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Clock size={14} color="var(--accent)" />
                      <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#fff" }}>{rep.date} @ {rep.time}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteReport(rep.id)}
                      style={{ background: "transparent", color: "rgba(239, 68, 68, 0.4)", border: "none", cursor: "pointer" }}
                      title="Delete Report"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="report-content" style={{ fontSize: "0.9rem", display: "flex" ,flexDirection: "column", gap: "0.5rem", overflowY: "auto", maxHeight: "calc(100% - 2rem)" }}>
                    {renderMarkdown(rep.text)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: AI Chat Coach */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", padding: "1rem", height: "100%", minHeight: 0 }}>
            <div className="glass-card-header" style={{ marginBottom: "0.75rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Brain size={16} color="var(--accent)" />
                <span>Coach Chat</span>
              </h3>
            </div>

            <div style={{ 
              flex: 1, 
              background: "rgba(0,0,0,0.2)", 
              borderRadius: "8px", 
              padding: "0.75rem", 
              overflowY: "auto", 
              display: "flex", 
              flexDirection: "column", 
              gap: "0.75rem",
              border: "1px solid rgba(255,255,255,0.03)",
              marginBottom: "0.75rem",
              minHeight: 0
            }}>
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  style={{
                    alignSelf: msg.role === "model" ? "flex-start" : "flex-end",
                    background: msg.role === "model" ? "rgba(255,255,255,0.05)" : "var(--accent)",
                    color: msg.role === "model" ? "var(--text-secondary)" : "#fff",
                    borderRadius: msg.role === "model" ? "0px 12px 12px 12px" : "12px 0px 12px 12px",
                    padding: "0.5rem 0.75rem",
                    maxWidth: "85%",
                    fontSize: "0.85rem",
                    lineHeight: "1.4",
                    border: msg.role === "model" ? "1px solid rgba(255,255,255,0.03)" : "none"
                  }}
                >
                  {msg.role === "model" ? renderMarkdown(msg.text) : msg.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{
                  alignSelf: "flex-start",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-muted)",
                  borderRadius: "0px 12px 12px 12px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.85rem",
                  border: "1px solid rgba(255,255,255,0.03)"
                }}>
                  Thinking...
                </div>
              )}
            </div>

            {/* Chat Form */}
            <form onSubmit={handleSendChatMessage} style={{ display: "flex", gap: "0.5rem" }}>
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask your coach anything..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none"
                }}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="btn-primary" 
                style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }}
              >
                <SendHorizontal size={14} />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
