import { useApp } from "../context/AppContext";
import { 
  ResponsiveContainer, 
  LineChart,
  Line,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Legend,
  CartesianGrid
} from "recharts";
import { TrendingUp, Flame, Calendar, Award, CheckSquare, Target, Zap, Star, Activity } from "lucide-react";

export default function Analytics() {
  const { activityLogs, dailyPlans, distractions, tracks, goals, settings } = useApp();

  const todayStr = new Date().toLocaleDateString("en-CA");

  // --- 1. Compute Stats ---
  
  // A. Total study hours
  const totalStudyMinutes = activityLogs.reduce((sum, act) => sum + act.durationMinutes, 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
  
  // B. Goal completion rate
  const completedGoals = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;
  const goalCompletionPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // C. DSA Solves sum
  const dsaTracks = tracks.filter(t => t.category === "dsa");
  const totalDsaSolves = dsaTracks.reduce((sum, t) => sum + t.progress, 0);

  // D. Average project completion percent
  const projectTracks = tracks.filter(t => t.category === "project" || t.category === "development");
  const averageProjectPct = projectTracks.length > 0 
    ? Math.round(projectTracks.reduce((sum, t) => sum + (t.progress / t.target * 100), 0) / projectTracks.length)
    : 0;

  // E. Streak logic
  const getOutcomeStreak = () => {
    let streak = 0;
    const solvedDates = new Set(activityLogs.map(a => a.date));
    let checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toLocaleDateString("en-CA");
      if (solvedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (dateStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  const currentStreak = getOutcomeStreak();

  // F. Heatmap data (Last 28 Days)
  const getHeatmapData = () => {
    const data = [];
    const today = new Date();
    const activityDates = activityLogs.map(a => a.date);

    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA");
      const count = activityDates.filter(date => date === dateStr).length;

      data.push({
        date: dateStr,
        dayNum: d.getDate(),
        count: count
      });
    }
    return data;
  };

  const heatmapDays = getHeatmapData();

  // G. Study hours trends over the last 7 days
  const getWeeklyTrendData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA");
      
      const dayActs = activityLogs.filter(a => a.date === dateStr);
      const studyMins = dayActs.reduce((sum, a) => sum + a.durationMinutes, 0);
      const studyHrs = parseFloat((studyMins / 60).toFixed(1));

      const dayPlans = dailyPlans[dateStr] || [];
      const plannedMins = dayPlans.reduce((sum, p) => sum + (parseInt(p.estimatedMinutes, 10) || 0), 0);
      const plannedHrs = parseFloat((plannedMins / 60).toFixed(1));

      const distractMins = distractions.filter(dist => dist.date === dateStr).reduce((sum, dist) => sum + dist.durationMinutes, 0);

      data.push({
        name: d.toLocaleDateString([], { weekday: "short" }),
        StudyHours: studyHrs,
        PlannedHours: plannedHrs,
        WastedMinutes: distractMins
      });
    }
    return data;
  };

  const weeklyTrendData = getWeeklyTrendData();

  // H. Track Insights
  let totalMastered = 0;
  let totalPlaylistWatched = 0;
  let totalPlaylistApplied = 0;
  let sumConfidence = 0;
  let countConfidence = 0;

  tracks.forEach(t => {
    (t.tasks || []).forEach(task => {
      if (task.confidence >= 5) totalMastered++;
      if (task.confidence > 0) {
        sumConfidence += task.confidence;
        countConfidence++;
      }
      if (t.category === "playlist" || t.category === "course" || t.category === "book") {
        if (["Completed", "Solved", "Mastered", "Applied", "Revised"].includes(task.status)) {
          totalPlaylistWatched++;
          if (task.status === "Applied" || task.status === "Mastered" || task.confidence >= 4) {
            totalPlaylistApplied++;
          }
        }
      }
    });
  });

  const avgConfidence = countConfidence > 0 ? (sumConfidence / countConfidence).toFixed(1) : 0;
  const applicationRate = totalPlaylistWatched > 0 ? Math.round((totalPlaylistApplied / totalPlaylistWatched) * 100) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Analytics & Consistency Profile</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Measure outcomes, monitor deep work blocks, and audit attention leaks over time.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem" }}>
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.75rem", borderRadius: "10px" }} className={currentStreak > 0 ? "animate-pulse" : ""}>
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Current Streak</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{currentStreak} Days</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(var(--accent-rgb), 0.1)", color: "var(--accent)", padding: "0.75rem", borderRadius: "10px" }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Study Time</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{totalStudyHours} hrs</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(127, 186, 0, 0.1)", color: "#7fba00", padding: "0.75rem", borderRadius: "10px" }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Goal Achievement</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{goalCompletionPct}% ({completedGoals}/{totalGoals})</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(236, 72, 153, 0.1)", color: "#ec4899", padding: "0.75rem", borderRadius: "10px" }}>
            <Target size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>{settings?.pillar2Name || "Project"} Progress</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{averageProjectPct}% Avg</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginTop: "1.25rem" }}>
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem", borderLeft: "3px solid #ffb900" }}>
          <div style={{ background: "rgba(255, 185, 0, 0.1)", color: "#ffb900", padding: "0.75rem", borderRadius: "10px" }}>
            <Zap size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Mastered Items</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{totalMastered}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>5-Star Confidence Ratings</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem", borderLeft: "3px solid #00a2ed" }}>
          <div style={{ background: "rgba(0, 162, 237, 0.1)", color: "#00a2ed", padding: "0.75rem", borderRadius: "10px" }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Application Rate</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{applicationRate}%</div>
            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Watched vs High Confidence</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem", borderLeft: "3px solid var(--accent)" }}>
          <div style={{ background: "rgba(var(--accent-rgb), 0.1)", color: "var(--accent)", padding: "0.75rem", borderRadius: "10px" }}>
            <Star size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Avg Confidence</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{avgConfidence} / 5</div>
            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Across all tracks</div>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="glass-card">
        <div className="glass-card-header">
          <h3>
            <Calendar size={16} style={{ color: "var(--accent)", marginRight: "4px" }} />
            <span>28-Day Consistency heatmap</span>
          </h3>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Records daily outcome completion streaks</span>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", padding: "1rem 0" }}>
          <div className="heatmap-grid">
            {heatmapDays.map(day => (
              <div
                key={day.date}
                style={{
                  aspectRatio: "1/1",
                  borderRadius: "4px",
                  background: day.count > 0 ? "rgba(var(--accent-rgb), 0.3)" : "rgba(255,255,255,0.02)",
                  border: day.count > 0 ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
                title={`${day.date}: Logged ${day.count} outcome items`}
              >
                <span style={{ fontSize: "0.6rem", fontWeight: "bold", opacity: day.count > 0 ? 0.95 : 0.2 }}>
                  {day.dayNum}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: 10, height: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "2px" }}></div>
              <span>No Activity</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: 10, height: 10, background: "rgba(var(--accent-rgb), 0.3)", border: "1px solid var(--accent)", borderRadius: "2px" }}></div>
              <span>Outcomes Logged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        
        {/* Line Chart: Daily Study Hours */}
        <div className="glass-card">
          <div className="glass-card-header">
            <h3>Daily Study Hours Trend</h3>
          </div>
          <div style={{ width: "100%", height: "240px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <ChartTooltip />
                <Line type="monotone" dataKey="StudyHours" name="Study Hours" stroke="var(--accent)" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Focus Work vs Attention Leak (Wasted Minutes) */}
        <div className="glass-card">
          <div className="glass-card-header">
            <h3>Plan vs Actual (Hours)</h3>
          </div>
          <div style={{ width: "100%", height: "240px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <ChartTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="PlannedHours" name="Planned (Hrs)" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="StudyHours" name="Actual Logged (Hrs)" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}