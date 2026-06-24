import { createContext, useContext, useState, useEffect, useRef } from "react";

const AppContext = createContext();

// 1. DEFAULT STRUCTURES
const DEFAULT_SETTINGS = {
  themeColor: "#00a2ed",
  targetCompany: "Microsoft",
  pillar1Name: "DSA Practice",
  pillar2Name: "Development",
  oddEvenMode: true,
  vacationStart: "",
  vacationEnd: "",
  permanentGoals: {
    dsa: 3, // Hours
    learning: 2, // Hours
    development: 2, // Hours
    reading: 10, // Pages
    exercise: 30 // Minutes
  }
};

// PRESETS
const DEFAULT_PRESETS = {
  pomodoro: {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  },

  deep: {
    focus: 50 * 60,
    shortBreak: 10 * 60,
    longBreak: 20 * 60
  },

  intense: {
    focus: 90 * 60,
    shortBreak: 15 * 60,
    longBreak: 30 * 60
  }
};
const PRESETS = JSON.parse(localStorage.getItem("timerPresets")) || DEFAULT_PRESETS;

const DEFAULT_TRACKS = [];
const DEFAULT_PLANS = {};
const DEFAULT_GOALS = [];
const DEFAULT_ACTIVITIES = [];
const DEFAULT_DISTRACTIONS = [];
const DEFAULT_FOCUS_SESSIONS = [];

const DEFAULT_DAILY_REFLECTIONS = [];
const DEFAULT_DAILY_SCORE_HISTORY = {};

export const AppProvider = ({ children }) => {
  // --- Version Check & Automated Migration Clean Reset ---
  const CURRENT_OS_VERSION = "v7";
  const savedVersion = localStorage.getItem("lp_os_version");
  if (savedVersion !== CURRENT_OS_VERSION) {
    const keysToRemove = [
      "lp_learningTracks", "lp_projects", "lp_roadmaps", 
      "lp_dailyPlans", "lp_goals", "lp_activities", "lp_distractions", 
      "lp_focusSessions", "lp_activityLogs", "lp_weeklyReviews", "lp_notifications",
      "lp_todayMission", "lp_currentFocusTask", "lp_dailyScoreHistory", "lp_dailyReflections"
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem("lp_os_version", CURRENT_OS_VERSION);
  }

  // Helper to load localStorage safely
  const loadState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error("Error loading localStorage key: " + key, e);
      return defaultValue;
    }
  };

  // Helper to save localStorage safely
  const saveState = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Error saving localStorage key: " + key, e);
    }
  };

  // --- 2. STATES & AUTOMATIC LOCAL STORAGE DATA MIGRATIONS ---
  const [settings, setSettings] = useState(() => {
    const loaded = loadState("lp_settings", DEFAULT_SETTINGS);
    return {
      themeColor: loaded?.themeColor || DEFAULT_SETTINGS.themeColor,
      targetCompany: loaded?.targetCompany || DEFAULT_SETTINGS.targetCompany,
      pillar1Name: loaded?.pillar1Name || DEFAULT_SETTINGS.pillar1Name,
      pillar2Name: loaded?.pillar2Name || DEFAULT_SETTINGS.pillar2Name,
      oddEvenMode: loaded?.oddEvenMode !== undefined ? loaded.oddEvenMode : DEFAULT_SETTINGS.oddEvenMode,
      vacationStart: loaded?.vacationStart || "",
      vacationEnd: loaded?.vacationEnd || "",
      permanentGoals: {
        dsa: loaded?.permanentGoals?.dsa !== undefined ? parseFloat(loaded.permanentGoals.dsa) : DEFAULT_SETTINGS.permanentGoals.dsa,
        learning: loaded?.permanentGoals?.learning !== undefined ? parseFloat(loaded.permanentGoals.learning) : DEFAULT_SETTINGS.permanentGoals.learning,
        development: loaded?.permanentGoals?.development !== undefined ? parseFloat(loaded.permanentGoals.development) : DEFAULT_SETTINGS.permanentGoals.development,
        reading: loaded?.permanentGoals?.reading !== undefined ? parseInt(loaded.permanentGoals.reading, 10) : DEFAULT_SETTINGS.permanentGoals.reading,
        exercise: loaded?.permanentGoals?.exercise !== undefined ? parseInt(loaded.permanentGoals.exercise, 10) : DEFAULT_SETTINGS.permanentGoals.exercise
      }
    };
  });

  const [tracks, setTracks] = useState(() => {
    try {
      const savedTracks = localStorage.getItem("lp_tracks");
      if (savedTracks) {
        const parsed = JSON.parse(savedTracks);
        return parsed.map(track => {
          if (!track.tasks) track.tasks = [];
          track.tasks = track.tasks.map(task => {
            // Check if it's already the new format
            if (task.status !== undefined && task.confidence !== undefined) return task;
            // Migrate from old { id, text, completed } format
            return {
              id: task.id || "item-" + Math.random().toString(36).substr(2, 9),
              title: task.text || "Untitled Item",
              status: task.completed ? (track.category === "dsa" ? "Solved" : "Completed") : "Not Started",
              confidence: task.completed ? 4 : 0,
              timeSpentMins: 0,
              notes: "",
              dateCompleted: task.completed ? new Date().toLocaleDateString("en-CA") : null,
              needsRevision: false,
              keyTakeaway: "",
              actionItem: "",
              exercisesCompleted: false
            };
          });
          return track;
        });
      }
      // Migrate from old schemas
      const migrated = [];
      const legacyTracks = localStorage.getItem("lp_learningTracks");
      if (legacyTracks) {
        const parsed = JSON.parse(legacyTracks);
        if (Array.isArray(parsed)) {
          parsed.forEach(t => {
            migrated.push({
              id: t.id || "track-" + Math.random().toString(36).substr(2, 9),
              title: t.title || "Untitled Track",
              category: t.category || "course",
              target: parseInt(t.target, 10) || 50,
              progress: parseInt(t.progress, 10) || 0,
              unit: t.category === "book" ? "Pages" : t.category === "playlist" ? "Videos" : "Lessons",
              priority: t.priority || "medium",
              deadline: t.deadline || "",
              status: t.status === "done" ? "completed" : "learning",
              tasks: t.tasks || []
            });
          });
        }
      }
      const legacyProjects = localStorage.getItem("lp_projects");
      if (legacyProjects) {
        const parsed = JSON.parse(legacyProjects);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            const miles = p.milestones || [];
            migrated.push({
              id: p.id || "proj-" + Math.random().toString(36).substr(2, 9),
              title: p.name || "Untitled Project",
              category: "project",
              target: 100,
              progress: p.status === "done" ? 100 : Math.round((miles.filter(m => m.checked).length / (miles.length || 1)) * 100),
              unit: "Percent",
              priority: p.priority || "medium",
              deadline: p.deadline || "",
              status: p.status === "done" ? "completed" : "learning",
              tasks: miles.map(m => ({ id: m.id, text: m.text, completed: m.checked })),
              description: p.desc || ""
            });
          });
        }
      }
      return migrated.length > 0 ? migrated : DEFAULT_TRACKS;
    } catch (e) {
      console.error("Failed to migrate tracks:", e);
      return DEFAULT_TRACKS;
    }
  });

  const [dailyPlans, setDailyPlans] = useState(() => {
    const loaded = loadState("lp_dailyPlans", null);
    if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) return DEFAULT_PLANS;
    // Migrate categories
    const migrated = {};
    Object.entries(loaded).forEach(([dateStr, plans]) => {
      if (Array.isArray(plans)) {
        migrated[dateStr] = plans.map(p => {
          let category = p.category;
          if (!category) {
            if (p.type === "study" || p.type === "development") category = "must";
            else if (p.type === "learning") category = "should";
            else category = "optional";
          }
          return {
            id: p.id || "p-block-" + Math.random().toString().split(".")[1],
            start: p.start || "09:00 AM",
            end: p.end || "11:00 AM",
            label: p.label || "TASK",
            desc: p.desc || "",
            category: category,
            completed: p.completed || false
          };
        });
      }
    });
    return migrated;
  });

  const [goals, setGoals] = useState(() => {
    const loaded = loadState("lp_goals", DEFAULT_GOALS);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : DEFAULT_GOALS;
  });
  
  // Unified Activity Ledger (Replaces activities and focusSessions)
  const [activityLogs, setActivityLogs] = useState(() => {
    const loaded = loadState("lp_activityLogs", []);
    let logs = Array.isArray(loaded) ? loaded.filter(Boolean) : [];
    
    // Deduplicate old logs (cleaning up bug where generic log and specific log fired simultaneously)
    const toDelete = new Set();
    const focusLogs = logs.filter(l => l.mode === "focus" || l.mode === "task");
    
    for (let i = 0; i < focusLogs.length; i++) {
      for (let j = i + 1; j < focusLogs.length; j++) {
        const log1 = focusLogs[i];
        const log2 = focusLogs[j];
        
        if (log1.date === log2.date && log1.durationMinutes === log2.durationMinutes) {
          const time1 = parseInt(log1.id.replace("act-", "")) || 0;
          const time2 = parseInt(log2.id.replace("act-", "")) || 0;
          
          if (Math.abs(time1 - time2) < 2000) { // within 2 seconds
            if (log1.desc === "Completed focus session" && log2.desc !== "Completed focus session") {
              toDelete.add(log1.id);
            } else if (log2.desc === "Completed focus session" && log1.desc !== "Completed focus session") {
              toDelete.add(log2.id);
            }
          }
        }
      }
    }
    
    if (toDelete.size > 0) {
      logs = logs.filter(l => !toDelete.has(l.id));
      localStorage.setItem("lp_activityLogs", JSON.stringify(logs));
    }
    
    return logs;
  });

  const [distractions, setDistractions] = useState(() => {
    const loaded = loadState("lp_distractions", DEFAULT_DISTRACTIONS);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : DEFAULT_DISTRACTIONS;
  });
  const [notifications, setNotifications] = useState(() => {
    const loaded = loadState("lp_notifications", []);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : [];
  });

  // --- Execution Center States ---
  const [todayMission, setTodayMission] = useState(() => {
    const loaded = loadState("lp_todayMission", []);
    return Array.isArray(loaded) ? loaded : [];
  });
  
  const [currentFocusTask, setCurrentFocusTask] = useState(() => {
    return loadState("lp_currentFocusTask", null);
  });
  
  const [dailyScoreHistory, setDailyScoreHistory] = useState(() => {
    return loadState("lp_dailyScoreHistory", DEFAULT_DAILY_SCORE_HISTORY);
  });
  
  const [dailyReflections, setDailyReflections] = useState(() => {
    const loaded = loadState("lp_dailyReflections", DEFAULT_DAILY_REFLECTIONS);
    return Array.isArray(loaded) ? loaded : DEFAULT_DAILY_REFLECTIONS;
  });

  const [dsaProblems, setDsaProblems] = useState(() => {
    const loaded = loadState("lp_dsaProblems", []);
    return Array.isArray(loaded) ? loaded : [];
  });

  const [roadmaps, setRoadmaps] = useState(() => {
    const loaded = loadState("lp_roadmaps", []);
    return Array.isArray(loaded) ? loaded : [];
  });

  const [projects, setProjects] = useState(() => {
    const loaded = loadState("lp_projects", []);
    return Array.isArray(loaded) ? loaded : [];
  });

  // Focus Timer active states
  const [timerSeconds, setTimerSeconds] = useState(() => loadState("lp_timerSeconds", 0));
  const [timerIsRunning, setTimerIsRunning] = useState(() => loadState("lp_timerIsRunning", false));
  const [timerMode, setTimerMode] = useState(() => loadState("lp_timerMode", "focus")); // focus, shortBreak, longBreak
 
  const [timerOverrideLimit, setTimerOverrideLimit] = useState(() => loadState("lp_timerOverrideLimit", null)); // Dynamic override in seconds
  const [timerFinishEvent, setTimerFinishEvent] = useState(0); // Counter to trigger events across the app
  const [timerActivePlanId, setTimerActivePlanId] = useState(null);
  const [presetMode, setPresetMode] = useState(() => {
    const loaded = loadState("lp_presetMode", "pomodoro");
    return loaded && PRESETS[loaded] ? loaded : "pomodoro";
  });
  const timerConfig = PRESETS[presetMode] || PRESETS["pomodoro"];
  // Track today's completed focus seconds
  const [todayFocusSeconds, setTodayFocusSeconds] = useState(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const saved = localStorage.getItem("lp_today_focus_seconds_" + todayStr);
    return saved ? parseInt(saved) : 0;
  });

  // Today's goals status (checked permanent goals)
  const [todayGoalsChecked, setTodayGoalsChecked] = useState(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    return loadState("lp_today_goals_checked_" + todayStr, {
      dsa: false,
      learning: false,
      development: false,
      reading: false,
      exercise: false
    });
  });

  // Today's permanent goal progress in minutes
  const [todayPermanentProgress, setTodayPermanentProgress] = useState(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    return loadState("lp_today_permanent_progress_" + todayStr, {
      dsa: 0,
      learning: 0,
      development: 0,
      reading: 0,
      exercise: 0
    });
  });

  // --- Focus Verification System States ---
  const [activeFocusSession, setActiveFocusSession] = useState(() => {
    return loadState("lp_activeFocusSession", null);
  });
  const [pendingFocusCheck, setPendingFocusCheck] = useState(() => {
    return loadState("lp_pendingFocusCheck", null);
  });
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [timerPausedAt, setTimerPausedAt] = useState(() => {
    const val = localStorage.getItem("lp_timerPausedAt");
    return val ? parseInt(val, 10) : null;
  });

  // --- 3. SAVE STATES TO LOCALSTORAGE ---
  useEffect(() => { localStorage.setItem("lp_settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("lp_tracks", JSON.stringify(tracks)); }, [tracks]);
  useEffect(() => { localStorage.setItem("lp_dailyPlans", JSON.stringify(dailyPlans)); }, [dailyPlans]);
  useEffect(() => { localStorage.setItem("lp_goals", JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem("lp_activityLogs", JSON.stringify(activityLogs)); }, [activityLogs]);
  useEffect(() => { localStorage.setItem("lp_distractions", JSON.stringify(distractions)); }, [distractions]);
  useEffect(() => { localStorage.setItem("lp_notifications", JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("lp_projects", JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem("lp_todayMission", JSON.stringify(todayMission)); }, [todayMission]);
  useEffect(() => saveState("lp_currentFocusTask", currentFocusTask), [currentFocusTask]);
  useEffect(() => saveState("lp_dailyScoreHistory", dailyScoreHistory), [dailyScoreHistory]);
  useEffect(() => saveState("lp_dailyReflections", dailyReflections), [dailyReflections]);
  useEffect(() => saveState("lp_dsaProblems", dsaProblems), [dsaProblems]);
  useEffect(() => saveState("lp_roadmaps", roadmaps), [roadmaps]);
  useEffect(() => saveState("lp_projects", projects), [projects]);
  useEffect(() => saveState("lp_timerSeconds", timerSeconds), [timerSeconds]);
  useEffect(() => saveState("lp_timerIsRunning", timerIsRunning), [timerIsRunning]);
  useEffect(() => saveState("lp_timerMode", timerMode), [timerMode]);
  useEffect(() => saveState("lp_timerOverrideLimit", timerOverrideLimit), [timerOverrideLimit]);
  useEffect(() => saveState("lp_activeFocusSession", activeFocusSession), [activeFocusSession]);
  useEffect(() => saveState("lp_pendingFocusCheck", pendingFocusCheck), [pendingFocusCheck]);
  useEffect(() => {
    if (timerPausedAt !== null) {
      localStorage.setItem("lp_timerPausedAt", timerPausedAt.toString());
    } else {
      localStorage.removeItem("lp_timerPausedAt");
    }
  }, [timerPausedAt]);

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    localStorage.setItem("lp_today_focus_seconds_" + todayStr, todayFocusSeconds.toString());
  }, [todayFocusSeconds]);

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    localStorage.setItem("lp_today_goals_checked_" + todayStr, JSON.stringify(todayGoalsChecked));
  }, [todayGoalsChecked]);

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    localStorage.setItem("lp_today_permanent_progress_" + todayStr, JSON.stringify(todayPermanentProgress));
  }, [todayPermanentProgress]);
  useEffect(() => saveState("lp_presetMode", presetMode), [presetMode]);
  // --- 4. TIMER TICK EFFECT (Resilient to background throttling) ---
  const [lastTick, setLastTick] = useState(null);
  const prevTimerSecondsRef = useRef(0);

  useEffect(() => {
    if (timerIsRunning) {
      setLastTick(Date.now());
      prevTimerSecondsRef.current = timerSeconds;
    } else {
      setLastTick(null);
    }
  }, [timerIsRunning]);

  useEffect(() => {
    let interval = null;
    if (timerIsRunning && lastTick) {
      interval = setInterval(() => {
        setLastTick(prevTick => {
          const now = Date.now();
          const deltaSecs = Math.floor((now - prevTick) / 1000);
          
          if (deltaSecs > 0) {
            setTimerSeconds(prev => {
              const limit = timerOverrideLimit !== null ? timerOverrideLimit : timerConfig[timerMode];
              const nextSecs = prev + deltaSecs;
              return nextSecs >= limit ? limit : nextSecs;
            });
            return prevTick + (deltaSecs * 1000);
          }
          return prevTick;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerIsRunning, lastTick, timerMode, timerConfig, timerOverrideLimit]);

  // Helper to get random interval for verification check (7 to 15 minutes)
  const getRandomInterval = () => {
    const minMins = 7;
    const maxMins = 15;
    const randomMins = minMins + Math.random() * (maxMins - minMins);
    return Math.floor(randomMins * 60 * 1000);
    // return Math.floor(80*1000); // For testing: 80 seconds
  };

  // Helper to determine permanent target limits
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

  // Monitor timer starting, pausing, and task changes to initialize active session
  useEffect(() => {
    if (timerIsRunning && timerMode === "focus") {
      // Request notification permission if not asked yet
      try {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch (e) {}

      if (!activeFocusSession) {
        // Start new focus session
        const newSession = {
          id: `fs-${Date.now()}`,
          taskId: currentFocusTask,
          startTime: Date.now(),
          lastCheckTime: Date.now(),
          nextCheckTime: Date.now() + getRandomInterval(),
          verifiedSeconds: 0,
          distractedSeconds: 0,
          breakSeconds: 0,
          totalElapsedSeconds: 0,
          mode: "focus"
        };
        setActiveFocusSession(newSession);
        setTimerPausedAt(null);
      } else if (timerPausedAt) {
        // Resume session: calculate paused duration and shift check times forward
        const pauseDuration = Date.now() - timerPausedAt;
        setActiveFocusSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            lastCheckTime: prev.lastCheckTime + pauseDuration,
            nextCheckTime: prev.nextCheckTime + pauseDuration
          };
        });
        setTimerPausedAt(null);
      }
    } else if (!timerIsRunning && timerSeconds > 0 && timerMode === "focus") {
      // Timer is paused: record pause timestamp
      setTimerPausedAt(Date.now());
    }
  }, [timerIsRunning, timerMode, currentFocusTask]);

  // Periodically check if a focus verification is due
  useEffect(() => {
    if (!timerIsRunning || timerMode !== "focus" || !activeFocusSession || pendingFocusCheck) return;

    const limit = timerOverrideLimit !== null ? timerOverrideLimit : timerConfig[timerMode];
    if (limit < 10 * 60) return; // Disable focus checks for short timers (< 10 minutes)

    if (Date.now() >= activeFocusSession.nextCheckTime) {
      // Calculate work interval up to nextCheckTime. Ignore any pending time past nextCheckTime.
      const elapsed = Math.max(0, Math.floor((activeFocusSession.nextCheckTime - activeFocusSession.lastCheckTime) / 1000));
      
      // Play soft alert chime
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        const playTone = (time, freq, dur) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.15, time); // quiet and soft
          gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
          osc.start(time);
          osc.stop(time + dur);
        };
        playTone(now, 587.33, 0.15); // D5
        playTone(now + 0.12, 880, 0.3); // A5
      } catch (e) {}

      // Fire HTML5 System Notification
      try {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const n = new Notification("Focus Check-in", {
            body: "Are you still working? Tap to verify your focus.",
            requireInteraction: true
          });
          n.onclick = () => {
            window.focus();
          };
        }
      } catch (e) {}

      setPendingFocusCheck({
        sessionId: activeFocusSession.id,
        elapsedSeconds: elapsed,
        isFinal: false
      });
    }
  }, [timerSeconds, timerIsRunning, timerMode, activeFocusSession, pendingFocusCheck, timerOverrideLimit, timerConfig]);

  // Handle ticking limits and final check triggering
  useEffect(() => {
    if (!timerIsRunning) return;

    const limit = timerOverrideLimit !== null ? timerOverrideLimit : timerConfig[timerMode];
    const diff = timerSeconds - prevTimerSecondsRef.current;

    if (diff > 0) {
      prevTimerSecondsRef.current = timerSeconds;
    }

    if (timerSeconds >= limit) {
      setTimerIsRunning(false);
      setTimerSeconds(0);
      setTimerOverrideLimit(null);
      
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playBeep = (time, freq, duration) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
          osc.start(time);
          osc.stop(time + duration);
        };
        const now = audioCtx.currentTime;
        playBeep(now, 523.25, 0.4);       // C5
        playBeep(now + 0.4, 659.25, 0.4); // E5
        playBeep(now + 0.8, 783.99, 0.8); // G5 (longer)
      } catch (e) {}

      if (timerMode === "focus") {
        if (activeFocusSession) {
          // Calculate the time since lastCheckTime up to when it completed.
          // Note: if there is already a check pending, we do NOT add any additional time (since it's just been open).
          setPendingFocusCheck(prev => {
            if (prev) {
              return {
                ...prev,
                isFinal: true
              };
            }
            const finalElapsed = Math.floor((Date.now() - activeFocusSession.lastCheckTime) / 1000);
            return {
              sessionId: activeFocusSession.id,
              elapsedSeconds: finalElapsed,
              isFinal: true
            };
          });
        }
      } else {
        // Just standard finish for breaks
        setTimerFinishEvent(prev => ({ tick: (prev.tick || 0) + 1, limitSeconds: limit }));
      }
    }
  }, [timerSeconds, timerIsRunning, timerMode, timerConfig, timerActivePlanId, currentFocusTask, activeFocusSession]);

  const finishFocusSessionEarly = () => {
    setTimerIsRunning(false);
    if (activeFocusSession) {
      setPendingFocusCheck(prev => {
        // If there's already a check pending, just upgrade it to final (no additional time)
        if (prev) {
          return {
            ...prev,
            isFinal: true
          };
        }
        const finalElapsed = Math.floor((Date.now() - activeFocusSession.lastCheckTime) / 1000);
        return {
          sessionId: activeFocusSession.id,
          elapsedSeconds: finalElapsed,
          isFinal: true
        };
      });
    } else {
      setTimerSeconds(0);
      setTimerOverrideLimit(null);
    }
  };

  const answerFocusCheck = (choice, customData = null) => {
    if (!activeFocusSession || !pendingFocusCheck) return;

    const elapsed = pendingFocusCheck.elapsedSeconds;
    const isFinal = pendingFocusCheck.isFinal;

    setActiveFocusSession(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      
      if (choice === "working") {
        updated.verifiedSeconds = (updated.verifiedSeconds || 0) + elapsed;
        updated.verifiedMinutes = Math.floor(updated.verifiedSeconds / 60);
        setTodayFocusSeconds(s => s + elapsed);
      } else if (choice === "distracted") {
        updated.distractedSeconds = (updated.distractedSeconds || 0) + elapsed;
      } else if (choice === "break") {
        updated.breakSeconds = (updated.breakSeconds || 0) + elapsed;
      } else if (choice === "custom" && customData) {
        const { verified, distracted, breakTime } = customData;
        updated.verifiedSeconds = (updated.verifiedSeconds || 0) + verified;
        updated.verifiedMinutes = Math.floor(updated.verifiedSeconds / 60);
        updated.distractedSeconds = (updated.distractedSeconds || 0) + distracted;
        updated.breakSeconds = (updated.breakSeconds || 0) + breakTime;
        setTodayFocusSeconds(s => s + verified);
      }
      
      updated.totalElapsedSeconds = (updated.totalElapsedSeconds || 0) + elapsed;
      updated.lastCheckTime = Date.now();
      updated.nextCheckTime = Date.now() + getRandomInterval();
      
      return updated;
    });

    setPendingFocusCheck(null);

    if (isFinal) {
      setShowSummaryModal(true);
    }
  };

  const mapCategoryToPermanentKey = (category, title = "") => {
    if (!category) return null;
    const cat = category.toLowerCase();
    const tit = title ? title.toLowerCase() : "";

    // Check for DSA/coding keywords in title if it's not a project
    const isDsaKeyword = 
      tit.includes("dsa") || 
      tit.includes("coding") || 
      tit.includes("leetcode") || 
      tit.includes("algo") || 
      tit.includes("blind") || 
      tit.includes("roadmap") ||
      tit.includes("sde");

    if (cat === "dsa" || (cat !== "project" && isDsaKeyword)) return "dsa";
    if (cat === "project") return "development";
    if (cat === "course" || cat === "book" || cat === "playlist" || cat === "learning" || cat === "skill") return "learning";
    return null;
  };

  const getTrackDomain = (track) => {
    if (!track) return null;
    return mapCategoryToPermanentKey(track.category, track.title);
  };

  const mapTitleToPermanentKey = (title) => {
    if (!title) return null;
    const tit = title.toLowerCase();

    // DSA Practice
    if (
      tit.includes("dsa") || 
      tit.includes("coding") || 
      tit.includes("leetcode") || 
      tit.includes("algo") || 
      tit.includes("blind") || 
      tit.includes("roadmap") ||
      tit.includes("sde") ||
      tit.includes("problem solving") ||
      tit.includes("hackerrank") ||
      tit.includes("geekforgeeks") ||
      tit.includes("gfg") ||
      tit.includes("interview prep")
    ) {
      return "dsa";
    }

    // Development/Project
    if (
      tit.includes("project") || 
      tit.includes("build") || 
      tit.includes("dev") || 
      tit.includes("app") || 
      tit.includes("web") || 
      tit.includes("design") || 
      tit.includes("frontend") || 
      tit.includes("backend") || 
      tit.includes("fullstack") || 
      tit.includes("deploy") ||
      tit.includes("git") ||
      tit.includes("database") ||
      tit.includes("api")
    ) {
      return "development";
    }

    // Learning
    if (
      tit.includes("course") || 
      tit.includes("learn") || 
      tit.includes("study") || 
      tit.includes("playlist") || 
      tit.includes("tutorial") || 
      tit.includes("video") || 
      tit.includes("lecture") || 
      tit.includes("read") || 
      tit.includes("book") || 
      tit.includes("certification") || 
      tit.includes("concept")
    ) {
      return "learning";
    }

    return null;
  };

  const saveFocusSession = (reflection, planConfidence, planKeyTakeaway, planNotes) => {
    if (!activeFocusSession) return;

    const verifiedMins = activeFocusSession.verifiedSeconds > 0 
      ? Math.max(1, Math.round(activeFocusSession.verifiedSeconds / 60)) 
      : 0;
    const distractedMins = Math.round(activeFocusSession.distractedSeconds / 60);
    const breakMins = Math.round(activeFocusSession.breakSeconds / 60);
    const totalElapsedMins = Math.round(activeFocusSession.totalElapsedSeconds / 60);
    const focusScore = Math.round(
      (activeFocusSession.verifiedSeconds / 
       (activeFocusSession.verifiedSeconds + activeFocusSession.distractedSeconds || 1)) * 100
    );

    const todayStr = new Date().toLocaleDateString("en-CA");
    const taskId = activeFocusSession.taskId;

    if (taskId) {
      if (taskId.startsWith("perm-")) {
        const key = taskId.replace("perm-", "");
        const target = getPermanentTarget(key);
        const newProgress = (todayPermanentProgress[key] || 0) + verifiedMins;
        
        setTodayPermanentProgress(prev => ({
          ...prev,
          [key]: newProgress
        }));

        if (target > 0 && newProgress >= target) {
          setTodayGoalsChecked(prev => ({ ...prev, [key]: true }));
        }

        const act = {
          id: `act-${Date.now()}`,
          taskId: taskId,
          date: todayStr,
          durationMinutes: verifiedMins,
          desc: `Logged ${verifiedMins}m on ${key.toUpperCase()} Target`,
          mode: "focus",
          focusScore,
          reflection,
          verifiedMinutes: verifiedMins,
          distractedMinutes: distractedMins,
          breakMinutes: breakMins,
          totalElapsedMinutes: totalElapsedMins
        };
        setActivityLogs(prev => [...prev, act]);

      } else if (taskId.startsWith("plan-") || taskId.startsWith("p-")) {
        const todayStr = new Date().toLocaleDateString("en-CA");
        const todayPlansList = dailyPlans[todayStr] || [];
        const planItem = todayPlansList.find(p => p.id === taskId || `plan-${p.id}` === taskId);

        let isTrackMilestone = false;
        let trackId = "";
        let itemId = "";

        if (taskId.startsWith("plan-")) {
          const sourceId = taskId.replace("plan-", "");
          if (sourceId.includes("::")) {
            [trackId, itemId] = sourceId.split("::");
            isTrackMilestone = true;
          }
        }

        let track = null;
        if (isTrackMilestone) {
          track = tracks.find(t => t.id === trackId);
        } else if (planItem && planItem.sourceId) {
          const cleanTrackId = planItem.sourceId.split("::")[0];
          track = tracks.find(t => t.id === cleanTrackId);
        }

        let permKey = null;
        if (track) {
          permKey = getTrackDomain(track);
        } else if (planItem) {
          permKey = mapTitleToPermanentKey(planItem.label) || mapTitleToPermanentKey(planItem.desc);
        }

        if (permKey) {
          setTodayPermanentProgress(prev => {
            const newProgress = (prev[permKey] || 0) + verifiedMins;
            const target = getPermanentTarget(permKey);
            if (target > 0 && newProgress >= target) {
              setTodayGoalsChecked(goals => ({ ...goals, [permKey]: true }));
            }
            return { ...prev, [permKey]: newProgress };
          });
        }

        if (isTrackMilestone) {
          let isTaskFullyComplete = false;
          setTracks(prev => prev.map(t => {
            if (t.id === trackId) {
              const updatedTasks = t.tasks.map(item => {
                if (item.id === itemId) {
                  const target = item.targetTimeMins || 0;
                  const newTimeSpent = (item.timeSpentMins || 0) + verifiedMins;
                  const isNowComplete = target === 0 || newTimeSpent >= target;
                  isTaskFullyComplete = isNowComplete;

                  return {
                    ...item,
                    status: isNowComplete ? (t.category === "dsa" ? "Solved" : "Completed") : item.status,
                    confidence: planConfidence || item.confidence,
                    notes: planNotes || item.notes,
                    keyTakeaway: planKeyTakeaway || item.keyTakeaway,
                    timeSpentMins: newTimeSpent,
                    dateCompleted: isNowComplete ? todayStr : item.dateCompleted,
                    needsRevision: isNowComplete ? (planConfidence > 0 && planConfidence <= 3) : item.needsRevision
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

          const act = {
            id: `act-${Date.now()}`,
            taskId: taskId,
            date: todayStr,
            durationMinutes: verifiedMins,
            desc: `Logged ${verifiedMins}m on plan task`,
            mode: "task",
            trackId,
            confidence: planConfidence,
            keyTakeaway: planKeyTakeaway,
            notes: planNotes,
            focusScore,
            reflection,
            verifiedMinutes: verifiedMins,
            distractedMinutes: distractedMins,
            breakMinutes: breakMins,
            totalElapsedMinutes: totalElapsedMins
          };
          setActivityLogs(prev => [...prev, act]);

          if (isTaskFullyComplete) {
            setDailyPlans(prev => {
              const plans = prev[todayStr] || [];
              return {
                ...prev,
                [todayStr]: plans.map(p => (p.id === taskId || `plan-${p.id}` === taskId) ? { ...p, completed: true } : p)
              };
            });

            // If it's a DSA track/domain, auto-log to dsaProblems list
            if (permKey === "dsa") {
              const trackObj = tracks.find(t => t.id === trackId);
              const taskObj = trackObj?.tasks?.find(m => m.id === itemId);
              if (taskObj) {
                const problemEntry = {
                  id: `prob-${Date.now()}`,
                  title: taskObj.title,
                  link: taskObj.link || "https://leetcode.com/problems",
                  difficulty: taskObj.difficulty || "medium",
                  category: trackObj.title || "Syllabus",
                  notes: planNotes || "",
                  solvedAt: todayStr,
                  roadmapTaskId: `plan-${trackId}::${itemId}`
                };
                setDsaProblems(prev => {
                  if (prev.some(p => p.roadmapTaskId === `plan-${trackId}::${itemId}`)) return prev;
                  return [problemEntry, ...prev];
                });
              }
            }
          }
        } else {
          // Standalone plan item
          setDailyPlans(prev => {
            const plans = prev[todayStr] || [];
            return {
              ...prev,
              [todayStr]: plans.map(p => (p.id === taskId || `plan-${p.id}` === taskId) ? { ...p, completed: true } : p)
            };
          });

          const act = {
            id: `act-${Date.now()}`,
            taskId: taskId,
            date: todayStr,
            durationMinutes: verifiedMins,
            desc: `Logged ${verifiedMins}m on daily plan task "${planItem?.label || 'Task'}"`,
            mode: "task",
            focusScore,
            reflection,
            verifiedMinutes: verifiedMins,
            distractedMinutes: distractedMins,
            breakMinutes: breakMins,
            totalElapsedMinutes: totalElapsedMins
          };
          setActivityLogs(prev => [...prev, act]);
        }
      } else {
        setGoals(prev => prev.map(g => g.id === taskId ? { ...g, completed: true } : g));

        const goalItem = goals.find(g => g.id === taskId);
        const permKey = goalItem ? mapTitleToPermanentKey(goalItem.title) : null;
        if (permKey) {
          setTodayPermanentProgress(prev => {
            const newProgress = (prev[permKey] || 0) + verifiedMins;
            const target = getPermanentTarget(permKey);
            if (target > 0 && newProgress >= target) {
              setTodayGoalsChecked(goals => ({ ...goals, [permKey]: true }));
            }
            return { ...prev, [permKey]: newProgress };
          });
        }

        const act = {
          id: `act-${Date.now()}`,
          taskId: taskId,
          date: todayStr,
          durationMinutes: verifiedMins,
          desc: `Logged ${verifiedMins}m on Goal "${goalItem?.title || 'Goal'}"`,
          mode: "focus",
          focusScore,
          reflection,
          verifiedMinutes: verifiedMins,
          distractedMinutes: distractedMins,
          breakMinutes: breakMins,
          totalElapsedMinutes: totalElapsedMins
        };
        setActivityLogs(prev => [...prev, act]);
      }
    } else {
      const act = {
        id: `act-${Date.now()}`,
        date: todayStr,
        durationMinutes: verifiedMins,
        desc: "Completed focus session",
        mode: "focus",
        focusScore,
        reflection,
        verifiedMinutes: verifiedMins,
        distractedMinutes: distractedMins,
        breakMinutes: breakMins,
        totalElapsedMinutes: totalElapsedMins
      };
      setActivityLogs(prev => [...prev, act]);
    }

    setCurrentFocusTask(null);
    setActiveFocusSession(null);
    setTimerSeconds(0);
    setTimerOverrideLimit(null);
    setTimerActivePlanId(null);
    setPendingFocusCheck(null);
    setShowSummaryModal(false);
  };

  const cancelFocusSession = () => {
    setCurrentFocusTask(null);
    setActiveFocusSession(null);
    setTimerSeconds(0);
    setTimerOverrideLimit(null);
    setTimerActivePlanId(null);
    setPendingFocusCheck(null);
    setShowSummaryModal(false);
  };

  // Midnight checker logic (runs continuously to handle tabs left open overnight)
  useEffect(() => {
    const checkMidnight = () => {
      const todayStr = new Date().toLocaleDateString("en-CA");
      const lastDate = localStorage.getItem("lp_last_opened_date_v4");
      
      if (lastDate && lastDate !== todayStr) {
        setTodayFocusSeconds(0);
        setTodayGoalsChecked({
          dsa: false,
          learning: false,
          development: false,
          reading: false,
          exercise: false
        });
        setTodayPermanentProgress({
          dsa: 0,
          learning: 0,
          development: 0,
          reading: 0,
          exercise: 0
        });
        setTodayMission([]);
        setDailyPlans(prev => {
          if (!prev[todayStr]) {
            const savedTemplate = localStorage.getItem("lp_saved_plans_template");
            const templatePlans = savedTemplate ? JSON.parse(savedTemplate) : [];
            return {
              ...prev,
              [todayStr]: templatePlans.map(p => ({ ...p, id: "p-" + Date.now() + Math.random().toString().split(".")[1], completed: false }))
            };
          }
          return prev;
        });
        localStorage.setItem("lp_last_opened_date_v4", todayStr);
      } else if (!lastDate) {
        localStorage.setItem("lp_last_opened_date_v4", todayStr);
      }
    };

    checkMidnight(); // Run immediately
    const interval = setInterval(checkMidnight, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  // --- 5. SMART RECOMMENDATION ENGINE ---
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const newNotifications = [];

    // A. Check Neglected Tracks (no logged activity for 5+ days)
    const activeTracks = tracks.filter(t => t.status === "learning");
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    activeTracks.forEach(track => {
      const trackActivities = activityLogs.filter(a => a.trackId === track.id);
      if (trackActivities.length > 0) {
        const sortedAct = [...trackActivities].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestAct = sortedAct[0];
        if (new Date(latestAct.date) < fiveDaysAgo) {
          newNotifications.push({
            id: `neglect-${track.id}`,
            text: `"${track.title}" progress has stalled for 5 days. Consider recording a study log.`,
            type: "warning",
            tag: "Neglected Track"
          });
        }
      }
    });

    // B. Check Balance (DSA vs Projects in last 7 days)
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toLocaleDateString("en-CA"));
    }

    const last7DaysActivities = activityLogs.filter(a => last7Days.includes(a.date));
    let dsaMins = 0;
    let projMins = 0;
    last7DaysActivities.forEach(a => {
      const track = tracks.find(t => t.id === a.trackId);
      if (track) {
        if (track.category === "dsa") dsaMins += a.durationMinutes;
        if (track.category === "project") projMins += a.durationMinutes;
      }
    });

    if (dsaMins > 0 && projMins === 0 && activeTracks.some(t => t.category === "project")) {
      newNotifications.push({
        id: "balance-dsa-proj",
        text: "You are spending all your coding time on DSA rather than projects. Consider dedicating time to your projects.",
        type: "info",
        tag: "Suggested Focus"
      });
    } else if (dsaMins > projMins * 3 && projMins > 0) {
      newNotifications.push({
        id: "balance-dsa-proj-skew",
        text: "You are spending significantly more time on DSA than projects. Balance your portfolio preparation.",
        type: "info",
        tag: "Suggested Focus"
      });
    }

    // C. Check Impending Deadlines (next 3 days)
    const threeDaysHence = new Date();
    threeDaysHence.setDate(threeDaysHence.getDate() + 3);
    const threeDaysHenceStr = threeDaysHence.toLocaleDateString("en-CA");

    goals.filter(g => !g.completed && g.deadline).forEach(g => {
      if (g.deadline <= threeDaysHenceStr && g.deadline >= todayStr) {
        newNotifications.push({
          id: `deadline-goal-${g.id}`,
          text: `Goal deadline "${g.title}" is approaching on ${g.deadline}.`,
          type: "danger",
          tag: "Goal Deadline Alert"
        });
      }
    });

    activeTracks.filter(t => t.deadline).forEach(t => {
      if (t.deadline <= threeDaysHenceStr && t.deadline >= todayStr) {
        newNotifications.push({
          id: `deadline-track-${t.id}`,
          text: `Track target deadline for "${t.title}" is in 3 days.`,
          type: "danger",
          tag: "Track Deadline Alert"
        });
      }
    });

    // D. Execution Slippage (Must Do incomplete from yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA");
    const yesterdayPlans = dailyPlans[yesterdayStr] || [];
    const incompleteMust = yesterdayPlans.filter(p => p.category === "must" && !p.completed);
    if (incompleteMust.length > 0) {
      newNotifications.push({
        id: "planner-slippage-yesterday",
        text: `You missed ${incompleteMust.length} high priority "Must Do" planner tasks yesterday. Re-evaluate your planning.`,
        type: "warning",
        tag: "Execution Slippage"
      });
    }

    setNotifications(newNotifications);
  }, [tracks, activityLogs, goals, dailyPlans]);

  const value = {
    settings, setSettings,
    tracks, setTracks,
    dailyPlans, setDailyPlans,
    goals, setGoals,
    activityLogs, setActivityLogs,
    distractions, setDistractions,
    notifications, setNotifications,

    // Timer details
    timerSeconds, setTimerSeconds,
    timerIsRunning, setTimerIsRunning,
    timerMode, setTimerMode,
    timerConfig,
    timerOverrideLimit, setTimerOverrideLimit,
    timerFinishEvent, setTimerFinishEvent,
    timerActivePlanId, setTimerActivePlanId,
    todayFocusSeconds, setTodayFocusSeconds,
    presetMode, setPresetMode,
    // Today dynamic goals checked state
    todayGoalsChecked, setTodayGoalsChecked,

    // Execution Center
    todayMission, setTodayMission,
    currentFocusTask, setCurrentFocusTask,
    todayPermanentProgress, setTodayPermanentProgress,
    dailyScoreHistory, setDailyScoreHistory,
    dailyReflections, setDailyReflections,
    dsaProblems, setDsaProblems,
    roadmaps, setRoadmaps,
    projects, setProjects,

    // Focus Verification System
    activeFocusSession, setActiveFocusSession,
    pendingFocusCheck, setPendingFocusCheck,
    showSummaryModal, setShowSummaryModal,
    getPermanentTarget,
    finishFocusSessionEarly,
    answerFocusCheck,
    saveFocusSession,
    cancelFocusSession,
    mapCategoryToPermanentKey,
    getTrackDomain,
    mapTitleToPermanentKey,
    // Preset
    PRESETS
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);