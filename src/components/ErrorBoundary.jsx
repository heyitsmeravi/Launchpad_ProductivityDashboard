import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error: ", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "2rem", 
          color: "#f8fafc", 
          backgroundColor: "#050814", 
          minHeight: "100vh", 
          fontFamily: "ui-monospace, Consolas, monospace",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center"
        }}>
          <div style={{
            background: "rgba(9, 15, 36, 0.8)",
            border: "1px solid rgba(242, 80, 34, 0.3)",
            padding: "2rem",
            borderRadius: "12px",
            maxWidth: "600px",
            width: "100%",
            boxShadow: "0 8px 32px 0 rgba(0,0,0,0.5)"
          }}>
            <h2 style={{ color: "#f25022", marginBottom: "1rem" }}>LaunchPad OS v3 Rendering Error</h2>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>
              A runtime component error occurred. This is likely due to incompatible cached data from a previous version.
            </p>
            <pre style={{ 
              background: "rgba(0,0,0,0.3)", 
              padding: "1rem", 
              borderRadius: "6px", 
              overflowX: "auto", 
              textAlign: "left",
              fontSize: "0.8rem",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "#ef4444",
              marginBottom: "1.5rem",
              whiteSpace: "pre-wrap"
            }}>
              {this.state.error && this.state.error.toString()}
              {"\n\nStack Trace:\n"}
              {this.state.error && this.state.error.stack}
            </pre>
            
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  background: "#f25022",
                  color: "#fff",
                  border: "none",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.85rem"
                }}
              >
                Clear Database & Reset OS
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.85rem"
                }}
              >
                Retry Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
