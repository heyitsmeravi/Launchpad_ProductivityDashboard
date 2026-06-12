import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { Star } from "lucide-react";

export default function GlobalTimerCompletion() {
  const {
    timerFinishEvent,
    currentFocusTask,
    setCurrentFocusTask,
    setTimerIsRunning,
    settings,
    todayPermanentProgress,
    setTodayPermanentProgress,
    setActivityLogs,
    setDailyPlans,
    setTodayGoalsChecked,
    setGoals,
    tracks,
    setTracks
  } = useApp();

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  const todayStr = new Date().toLocaleDateString("en-CA");

  const getPermanentTarget = (key) => {
    const isOddDay = new Date().getDate() % 2 !== 0;
    switch(key) {
      case "dsa": 
        const baseDsa = settings?.permanentGoals?.dsa || 0;
        return settings?.oddEvenMode 
          ? Math.round(baseDsa * (isOddDay ? 1.2 : 0.6) * 60)
          : Math.round(baseDsa * 60);
      case "development": 
        const baseDev = settings?.permanentGoals?.development || 0;
        return settings?.oddEvenMode 
          ? Math.round(baseDev * (isOddDay ? 0.5 : 1.5) * 60)
          : Math.round(baseDev * 60);
      case "learning": return Math.round((settings?.permanentGoals?.learning || 0) * 60);
      case "reading": return Math.round((settings?.permanentGoals?.reading || 0) * 2);
      case "exercise": return Math.round((settings?.permanentGoals?.exercise || 0));
      default: return 0;
    }
  };

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

  useEffect(() => {
    if (timerFinishEvent?.tick > 0 && currentFocusTask) {
      const limitMins = Math.round((timerFinishEvent.limitSeconds || 0) / 60);
      const task = getTaskInfo(currentFocusTask);
      if (task) {
        markGoalComplete(task, limitMins);
      }
    }
  }, [timerFinishEvent]);

  const executeCompletion = (task) => {
    if (task.type === "plan") {
      setDailyPlans(prev => {
        const plans = prev[todayStr] || [];
        return {
          ...prev,
          [todayStr]: plans.map(p => p.id === task.id ? { ...p, completed: true } : p)
        };
      });
    } else if (task.type === "permanent") {
      const key = task.id.replace("perm-", "");
      setTodayGoalsChecked(prev => ({ ...prev, [key]: true }));
    } else {
      setGoals(prev => prev.map(g => g.id === task.id ? { ...g, completed: true } : g));
    }
    
    if (currentFocusTask === task.id) {
      setCurrentFocusTask(null);
      setTimerIsRunning(false);
    }
  };

  const markGoalComplete = (task, timeSpentMins) => {
    if (task.type === "plan" && task.sourceId && task.sourceId.includes("::")) {
      let taskTitle = task.title;
      const [trackId, itemId] = task.sourceId.split("::");
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const item = track.tasks?.find(i => i.id === itemId);
        if (item) taskTitle = item.title || item.text;
      }
      setCompletionData({
        task: { ...task, title: taskTitle },
        confidence: 0,
        notes: "",
        keyTakeaway: "",
        timeSpentMins: timeSpentMins,
        logAsStudy: true
      });
      setShowCompletionModal(true);
      return;
    }

    if (task.type === "permanent") {
      const key = task.id.replace("perm-", "");
      const target = getPermanentTarget(key);
      const newProgress = (todayPermanentProgress[key] || 0) + timeSpentMins;
      
      setTodayPermanentProgress(prev => ({ ...prev, [key]: newProgress }));

      const act = {
        id: `act-${Date.now()}`,
        taskId: task.id,
        date: todayStr,
        durationMinutes: timeSpentMins,
        desc: `Logged ${timeSpentMins}m on ${task.title}`,
        mode: "focus"
      };
      setActivityLogs(prev => [...prev, act]);

      if (target > 0 && newProgress < target) {
        if (currentFocusTask === task.id) {
          setCurrentFocusTask(null);
          setTimerIsRunning(false);
        }
        return;
      }
      
      executeCompletion(task);
      return;
    }
    
    // Generic log for simple goals or simple plans
    const act = {
      id: `act-${Date.now()}`,
      taskId: task.id,
      date: todayStr,
      durationMinutes: timeSpentMins,
      desc: `Logged ${timeSpentMins}m on ${task.title}`,
      mode: "focus"
    };
    setActivityLogs(prev => [...prev, act]);

    executeCompletion(task);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const task = completionData.task;
    const [trackId, itemId] = task.sourceId.split("::");

    let isTaskFullyComplete = false;

    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const updatedTasks = t.tasks.map(item => {
          if (item.id === itemId) {
            const target = item.targetTimeMins || 0;
            const newTimeSpent = (item.timeSpentMins || 0) + parseInt(completionData.timeSpentMins, 10);
            const isNowComplete = target === 0 || newTimeSpent >= target;
            isTaskFullyComplete = isNowComplete;

            return {
              ...item,
              status: isNowComplete ? (t.category === "dsa" ? "Solved" : "Completed") : item.status,
              confidence: completionData.confidence || item.confidence,
              notes: completionData.notes || item.notes,
              keyTakeaway: completionData.keyTakeaway || item.keyTakeaway,
              timeSpentMins: newTimeSpent,
              dateCompleted: isNowComplete ? todayStr : item.dateCompleted,
              needsRevision: isNowComplete ? (completionData.confidence > 0 && completionData.confidence <= 3) : item.needsRevision
            };
          }
          return item;
        });

        const completedCount = updatedTasks.filter(item => 
          ["Completed", "Solved", "Mastered", "Applied", "Revised"].includes(item.status)
        ).length;

        return { ...t, tasks: updatedTasks, progress: t.category === "project" ? t.progress : completedCount };
      }
      return t;
    }));

    if (completionData.logAsStudy) {
      const act = {
        id: `act-${Date.now()}`,
        taskId: task.id,
        date: todayStr,
        durationMinutes: completionData.timeSpentMins,
        desc: `Logged ${completionData.timeSpentMins}m on ${task.title}`,
        mode: "task",
        confidence: completionData.confidence,
        keyTakeaway: completionData.keyTakeaway,
        notes: completionData.notes,
        trackId: trackId
      };
      setActivityLogs(prev => [...prev, act]);
    }

    if (isTaskFullyComplete) {
      executeCompletion(task);
    } else {
      if (currentFocusTask === task.id) {
        setCurrentFocusTask(null);
        setTimerIsRunning(false);
      }
    }
    setShowCompletionModal(false);
  };

  if (!showCompletionModal || !completionData || !completionData.task) return null;

  return (
    <div className="modal-overlay">
      <form onSubmit={handleModalSubmit} className="modal-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ textAlign: "center" }}>
          <h3 style={{ color: "var(--accent)" }}>Task Completed!</h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{completionData.task.title}</p>
        </div>
        
        <div>
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Confidence Score (1-5)</label>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setCompletionData({ ...completionData, confidence: star })}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <Star fill={star <= completionData.confidence ? "#ffb900" : "none"} color={star <= completionData.confidence ? "#ffb900" : "var(--text-muted)"} size={32} />
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.7rem", textAlign: "center", color: "var(--text-muted)" }}>
            {completionData.confidence <= 3 && completionData.confidence > 0 ? "Will be added to Revision Queue" : ""}
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Time Spent (Minutes)</label>
          <input 
            type="number" 
            value={completionData.timeSpentMins}
            onChange={e => setCompletionData({...completionData, timeSpentMins: e.target.value})}
            min="1"
            required
            style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "bold" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Key Takeaway (Optional)</label>
          <input 
            type="text" 
            value={completionData.keyTakeaway}
            onChange={e => setCompletionData({...completionData, keyTakeaway: e.target.value})}
            placeholder="What did you learn?"
          />
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>Save Completion</button>
      </form>
    </div>
  );
}
