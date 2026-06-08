import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

// 1. DEFAULT STRUCTURES
const DEFAULT_SETTINGS = {
  themeColor: "#00a2ed",
  targetCompany: "Microsoft",
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

const DEFAULT_TRACKS = [
  { id: "track-1", title: "React Mastery Course", category: "course", target: 45, progress: 15, unit: "Lessons", priority: "medium", deadline: "2026-07-01", status: "learning", tasks: [] },
  { id: "track-2", title: "Striver's SDE Sheet", category: "dsa", target: 120, progress: 42, unit: "Problems", priority: "high", deadline: "2026-08-15", status: "learning", tasks: [] },
  { id: "track-3", title: "Deep Work Book", category: "book", target: 300, progress: 140, unit: "Pages", priority: "medium", deadline: "2026-06-30", status: "learning", tasks: [] },
  { id: "track-4", title: "Personal Portfolio Website", category: "project", target: 100, progress: 35, unit: "Percent", priority: "high", deadline: "2026-06-25", status: "learning", tasks: [
    { id: "m-1", text: "Design Mockups", completed: true },
    { id: "m-2", text: "Setup React Project", completed: true },
    { id: "m-3", text: "Deploy to Vercel", completed: false }
  ], description: "A sleek dev portfolio website." }
];

const DEFAULT_PLANS = {
  [new Date().toISOString().split("T")[0]]: [
    { id: "p-1", start: "09:00 AM", end: "11:00 AM", label: "DSA PRACTICE", desc: "Solve 3 Binary Trees questions", category: "must", completed: false },
    { id: "p-2", start: "11:00 AM", end: "12:30 PM", label: "REACT COURSE", desc: "Watch custom hooks video", category: "must", completed: false },
    { id: "p-3", start: "02:00 PM", end: "04:00 PM", label: "PORTFOLIO CODE", desc: "Build Navbar and animations", category: "should", completed: false },
    { id: "p-4", start: "05:00 PM", end: "06:00 PM", label: "BOOK READING", desc: "Read 10 pages of Deep Work", category: "optional", completed: false }
  ]
};

const DEFAULT_GOALS = [
  { id: "g-1", title: "Secure software engineering internship at Microsoft", category: "long-term", deadline: "2026-10-31", completed: false, trackId: "track-2" },
  { id: "g-2", title: "Complete Striver SDE sheet and review fundamentals", category: "monthly", deadline: "2026-06-30", completed: false, trackId: "track-2" },
  { id: "g-3", title: "Solve 20 linked list and tree problems", category: "weekly", deadline: "2026-06-14", completed: false, trackId: "track-2" },
  { id: "g-4", title: "Complete 3 React lessons & build Navbar component", category: "daily", deadline: "2026-06-08", completed: false, trackId: "track-1" }
];

const DEFAULT_ACTIVITIES = [
  { id: "act-1", date: "2026-06-05", desc: "Solved 3 Linked List problems in LeetCode", trackId: "track-2", durationMinutes: 90, quality: 4 },
  { id: "act-2", date: "2026-06-06", desc: "Completed 4 lessons in React Mastery course", trackId: "track-1", durationMinutes: 120, quality: 5 },
  { id: "act-3", date: "2026-06-07", desc: "Built responsive navbar CSS layout grid", trackId: "track-4", durationMinutes: 150, quality: 4 }
];

const DEFAULT_DISTRACTIONS = [
  { id: "dist-1", date: "2026-06-05", source: "youtube", durationMinutes: 30, trigger: "Boredom", frequency: 1 },
  { id: "dist-2", date: "2026-06-06", source: "reels", durationMinutes: 15, trigger: "Procrastination", frequency: 2 },
  { id: "dist-3", date: "2026-06-07", source: "gaming", durationMinutes: 45, trigger: "Stress release", frequency: 1 }
];

const DEFAULT_FOCUS_SESSIONS = [
  { date: "2026-06-05", durationSeconds: 2 * 3600, mode: "focus" },
  { date: "2026-06-06", durationSeconds: 4 * 3600, mode: "focus" },
  { date: "2026-06-07", durationSeconds: 3 * 3600, mode: "focus" }
];

export const AppProvider = ({ children }) => {
  // --- Version Check & Automated Migration Clean Reset ---
  const CURRENT_OS_VERSION = "v4";
  const savedVersion = localStorage.getItem("lp_os_version");
  if (savedVersion !== CURRENT_OS_VERSION) {
    const keysToRemove = [
      "lp_settings", "lp_learningTracks", "lp_projects", "lp_roadmaps", 
      "lp_dailyPlans", "lp_goals", "lp_activities", "lp_distractions", 
      "lp_focusSessions", "lp_weeklyReviews", "lp_notifications"
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

  // --- 2. STATES & AUTOMATIC LOCAL STORAGE DATA MIGRATIONS ---
  const [settings, setSettings] = useState(() => {
    const loaded = loadState("lp_settings", DEFAULT_SETTINGS);
    return {
      themeColor: loaded?.themeColor || DEFAULT_SETTINGS.themeColor,
      targetCompany: loaded?.targetCompany || DEFAULT_SETTINGS.targetCompany,
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
        return JSON.parse(savedTracks);
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
  const [activities, setActivities] = useState(() => {
    const loaded = loadState("lp_activities", DEFAULT_ACTIVITIES);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : DEFAULT_ACTIVITIES;
  });
  const [distractions, setDistractions] = useState(() => {
    const loaded = loadState("lp_distractions", DEFAULT_DISTRACTIONS);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : DEFAULT_DISTRACTIONS;
  });
  const [focusSessions, setFocusSessions] = useState(() => {
    const loaded = loadState("lp_focusSessions", DEFAULT_FOCUS_SESSIONS);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : DEFAULT_FOCUS_SESSIONS;
  });
  const [notifications, setNotifications] = useState(() => {
    const loaded = loadState("lp_notifications", []);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : [];
  });

  // Focus Timer active states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState("focus"); // focus, short, long
  const [timerConfig, setTimerConfig] = useState({ focus: 25 * 60, short: 5 * 60, long: 15 * 60 });
  const [timerActivePlanId, setTimerActivePlanId] = useState(null);

  // Track today's completed focus seconds
  const [todayFocusSeconds, setTodayFocusSeconds] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem("lp_today_focus_seconds_" + todayStr);
    return saved ? parseInt(saved) : 0;
  });

  // Today's goals status (checked permanent goals)
  const [todayGoalsChecked, setTodayGoalsChecked] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return loadState("lp_today_goals_checked_" + todayStr, {
      dsa: false,
      learning: false,
      development: false,
      reading: false,
      exercise: false
    });
  });

  // --- 3. SAVE STATES TO LOCALSTORAGE ---
  useEffect(() => { localStorage.setItem("lp_settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("lp_tracks", JSON.stringify(tracks)); }, [tracks]);
  useEffect(() => { localStorage.setItem("lp_dailyPlans", JSON.stringify(dailyPlans)); }, [dailyPlans]);
  useEffect(() => { localStorage.setItem("lp_goals", JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem("lp_activities", JSON.stringify(activities)); }, [activities]);
  useEffect(() => { localStorage.setItem("lp_distractions", JSON.stringify(distractions)); }, [distractions]);
  useEffect(() => { localStorage.setItem("lp_focusSessions", JSON.stringify(focusSessions)); }, [focusSessions]);
  useEffect(() => { localStorage.setItem("lp_notifications", JSON.stringify(notifications)); }, [notifications]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("lp_today_focus_seconds_" + todayStr, todayFocusSeconds.toString());
  }, [todayFocusSeconds]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("lp_today_goals_checked_" + todayStr, JSON.stringify(todayGoalsChecked));
  }, [todayGoalsChecked]);

  // --- 4. TIMER TICK EFFECT ---
  useEffect(() => {
    let interval = null;
    if (timerIsRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          const limit = timerConfig[timerMode];
          if (prev >= limit - 1) {
            setTimerIsRunning(false);
            // Audio alert tone
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.frequency.setValueAtTime(580, audioCtx.currentTime);
              gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.35);
            } catch (e) {}

            // Log Focus Session if focus mode completed
            if (timerMode === "focus") {
              const todayStr = new Date().toISOString().split("T")[0];
              setTodayFocusSeconds(s => s + timerConfig.focus);
              
              const newSession = {
                date: todayStr,
                durationSeconds: timerConfig.focus,
                mode: "focus"
              };
              setFocusSessions(prev => [...prev, newSession]);

              // If associated with a planner block, mark it completed
              if (timerActivePlanId) {
                setDailyPlans(prev => {
                  const todayPlans = prev[todayStr] || [];
                  const updated = todayPlans.map(p => p.id === timerActivePlanId ? { ...p, completed: true } : p);
                  return { ...prev, [todayStr]: updated };
                });
                setTimerActivePlanId(null);
              }
            }
            return 0;
          }

          if (timerMode === "focus") {
            setTodayFocusSeconds(s => s + 1);
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerIsRunning, timerMode, timerConfig, timerActivePlanId]);

  // Midnight checker logic
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
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
      setDailyPlans(prev => {
        if (!prev[todayStr]) {
          const savedTemplate = localStorage.getItem("lp_saved_plans_template");
          const templatePlans = savedTemplate ? JSON.parse(savedTemplate) : DEFAULT_PLANS[Object.keys(DEFAULT_PLANS)[0]];
          return {
            ...prev,
            [todayStr]: templatePlans.map(p => ({ ...p, id: "p-" + Date.now() + Math.random().toString().split(".")[1], completed: false }))
          };
        }
        return prev;
      });
    }
    localStorage.setItem("lp_last_opened_date_v4", todayStr);
  }, []);

  // --- 5. SMART RECOMMENDATION ENGINE ---
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newNotifications = [];

    // A. Check Neglected Tracks (no logged activity for 5+ days)
    const activeTracks = tracks.filter(t => t.status === "learning");
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    activeTracks.forEach(track => {
      const trackActivities = activities.filter(a => a.trackId === track.id);
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
      last7Days.push(d.toISOString().split("T")[0]);
    }

    const last7DaysActivities = activities.filter(a => last7Days.includes(a.date));
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
    const threeDaysHenceStr = threeDaysHence.toISOString().split("T")[0];

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
    const yesterdayStr = yesterday.toISOString().split("T")[0];
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
  }, [tracks, activities, goals, dailyPlans]);

  const value = {
    settings, setSettings,
    tracks, setTracks,
    dailyPlans, setDailyPlans,
    goals, setGoals,
    activities, setActivities,
    distractions, setDistractions,
    focusSessions, setFocusSessions,
    notifications, setNotifications,

    // Timer details
    timerSeconds, setTimerSeconds,
    timerIsRunning, setTimerIsRunning,
    timerMode, setTimerMode,
    timerConfig, setTimerConfig,
    timerActivePlanId, setTimerActivePlanId,
    todayFocusSeconds, setTodayFocusSeconds,

    // Today dynamic goals checked state
    todayGoalsChecked, setTodayGoalsChecked
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);