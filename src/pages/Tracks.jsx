import { useState } from "react";
import { useApp } from "../context/AppContext";
import * as XLSX from "xlsx";
import { 
  Plus, 
  Trash2, 
  Book, 
  PlayCircle, 
  GraduationCap, 
  Award, 
  ChevronRight, 
  Check, 
  Archive, 
  Upload, 
  Briefcase, 
  Wrench, 
  TrendingUp, 
  Clock, 
  Calendar,
  Layers,
  Edit2,
  Code,
  Star
} from "lucide-react";
import TrackDetail from "../components/TrackDetail";

export default function Tracks() {
  const { 
    tracks, 
    setTracks, 
    activityLogs,
    setActivityLogs,
    todayGoalsChecked,
    setTodayGoalsChecked,
    timerSeconds,
    currentFocusTask,
    setCurrentFocusTask,
    activeFocusSession,
    setActiveFocusSession,
    todayPermanentProgress,
    setTodayPermanentProgress,
    getPermanentTarget,
    mapCategoryToPermanentKey,
    getTrackDomain,
    setTimerMode,
    setTimerIsRunning,
    dsaProblems,
    setDsaProblems
  } = useApp();
  
  // Detail View State
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  
  // YouTube Playlist importer states
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importedTasks, setImportedTasks] = useState([]);
  const [showSourceImport, setShowSourceImport] = useState(false);
  const [playlistSourceText, setPlaylistSourceText] = useState("");
  
  // Excel Importer states
  const [pendingExcelData, setPendingExcelData] = useState(null);

  // Tab states: active, archived
  const [activeTab, setActiveTab] = useState("active");
  // Category filter: all, dsa, course, playlist, book, project, skill
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Create form modal toggle
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTrack, setNewTrack] = useState({
    title: "",
    category: "course",
    target: 50,
    progress: 0,
    unit: "Lessons",
    priority: "medium",
    deadline: "",
    description: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [bypassModalData, setBypassModalData] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "course",
    target: 50,
    progress: 0,
    unit: "Lessons",
    priority: "medium",
    deadline: "",
    description: "",
    status: "learning"
  });

  const startTrackTaskFocus = (trackId, itemId) => {
    const focusTaskId = `plan-${trackId}::${itemId}`;
    setCurrentFocusTask(focusTaskId);
    setTimerMode("focus");
    setTimerIsRunning(true);
    if (activeFocusSession) {
      setActiveFocusSession(prev => prev ? { ...prev, taskId: focusTaskId } : null);
    }
  };

  // Handle unit automatic defaults
  const handleCategoryChange = (cat, isEdit = false) => {
    let unit = "Lessons";
    if (cat === "dsa") unit = "Problems";
    else if (cat === "playlist") unit = "Videos";
    else if (cat === "book") unit = "Pages";
    else if (cat === "project") unit = "Percent";
    else if (cat === "skill") unit = "Tasks";

    if (isEdit) {
      setEditForm(prev => ({ ...prev, category: cat, unit }));
    } else {
      setNewTrack(prev => ({ ...prev, category: cat, unit }));
    }
  };

  const getPlaylistId = (url) => {
    try {
      const reg = /[&?]list=([^&#]+)/;
      const match = url.match(reg);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  };

  const handleImportPlaylist = async () => {
    if (!playlistUrl.trim()) {
      alert("Please enter a YouTube playlist URL first.");
      return;
    }

    const playlistId = getPlaylistId(playlistUrl);
    if (!playlistId) {
      alert("Could not extract a valid playlist ID from the URL. Please make sure the URL contains '?list=PLAYLIST_ID'.");
      return;
    }

    setIsImporting(true);
    
    // Multiple CORS proxies to try sequentially
    const corsProxies = [
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    let html = "";
    let fetchSuccess = false;
    let errorMsgs = [];

    for (let i = 0; i < corsProxies.length; i++) {
      const getProxyUrl = corsProxies[i];
      try {
        console.log(`Trying CORS proxy ${i + 1}...`);
        const proxyUrl = getProxyUrl(playlistUrl);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const text = await response.text();
        
        // Try parsing as AllOrigins JSON wrapper
        try {
          const json = JSON.parse(text);
          if (json && json.contents) {
            html = json.contents;
          } else {
            html = text;
          }
        } catch (e) {
          html = text;
        }

        if (html && (html.includes("ytInitialData") || html.includes("playlistVideoRenderer"))) {
          fetchSuccess = true;
          break;
        }
      } catch (e) {
        console.warn(`Proxy ${i + 1} failed:`, e);
        errorMsgs.push(`Proxy ${i + 1}: ${e.message || e}`);
      }
    }

    if (!fetchSuccess) {
      setIsImporting(false);
      const confirmFallback = window.confirm(`Failed to load the playlist HTML from all CORS proxies.\nErrors:\n${errorMsgs.join("\n")}\n\nWould you like to generate a placeholder playlist track with 20 blank video items instead?`);
      if (confirmFallback) {
        generatePlaceholderTrack();
      }
      return;
    }

    try {
      // Robust multiline extraction for ytInitialData using [\s\S]
      let jsonStr = null;
      const match = html.match(/(?:window\["ytInitialData"\]|ytInitialData)\s*=\s*({[\s\S]*?});/);
      if (match) {
        jsonStr = match[1];
      } else {
        const altMatch = html.match(/(?:window\["ytInitialData"\]|ytInitialData)\s*=\s*({[\s\S]*?})<\/script>/);
        if (altMatch) {
          jsonStr = altMatch[1];
        } else {
          // Attempt parsing by finding first { and matching braces roughly
          const sliceIndex = html.indexOf("ytInitialData = {");
          if (sliceIndex !== -1) {
            const startPos = sliceIndex + "ytInitialData = ".length;
            // Scan for matched closing brace
            let braceCount = 0;
            let endPos = -1;
            for (let j = startPos; j < html.length; j++) {
              if (html[j] === "{") braceCount++;
              if (html[j] === "}") braceCount--;
              if (braceCount === 0) {
                endPos = j + 1;
                break;
              }
            }
            if (endPos !== -1) {
              jsonStr = html.substring(startPos, endPos);
            }
          }
        }
      }

      if (!jsonStr) {
        throw new Error("Could not extract ytInitialData from YouTube page HTML. The format may have changed or the playlist is private.");
      }

      const ytData = JSON.parse(jsonStr);

      // Recursive scanner for video items to make it immune to YouTube DOM nesting changes
      const tasks = [];
      const findVideos = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (obj.playlistVideoRenderer) {
          const videoRenderer = obj.playlistVideoRenderer;
          const videoId = videoRenderer.videoId;
          const title = videoRenderer.title?.runs?.[0]?.text || `Video ${tasks.length + 1}`;
          const duration = videoRenderer.lengthText?.simpleText || "0:00";
          
          // Avoid duplicate video entries
          if (videoId && !tasks.some(t => t.videoId === videoId)) {
            tasks.push({
              id: `yt-video-${videoId}-${Date.now()}-${tasks.length}`,
              title: `${title} (${duration})`,
              status: "Not Started",
              confidence: 0,
              timeSpentMins: 0,
              notes: "",
              keyTakeaway: "",
              actionItem: "",
              dateCompleted: null,
              videoId: videoId
            });
          }
          return;
        }
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            findVideos(obj[key]);
          }
        }
      };

      findVideos(ytData);

      if (tasks.length === 0) {
        throw new Error("No videos found in the playlist. Please make sure the playlist is public and contains active videos.");
      }

      // Recursive scanner for playlist title
      let playlistTitle = "Imported YouTube Playlist";
      const findTitle = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (obj.playlistMetadataRenderer && obj.playlistMetadataRenderer.title) {
          playlistTitle = obj.playlistMetadataRenderer.title;
          return;
        }
        if (obj.playlistHeaderRenderer && obj.playlistHeaderRenderer.title?.simpleText) {
          playlistTitle = obj.playlistHeaderRenderer.title.simpleText;
          return;
        }
        if (obj.playlistHeaderRenderer && obj.playlistHeaderRenderer.title?.runs?.[0]?.text) {
          playlistTitle = obj.playlistHeaderRenderer.title.runs[0].text;
          return;
        }
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            findTitle(obj[key]);
          }
        }
      };

      findTitle(ytData);

      // Automatically fill in form values
      setNewTrack(prev => ({
        ...prev,
        title: playlistTitle,
        target: tasks.length,
        unit: "Videos",
        description: `YouTube playlist imported from URL (ID: ${playlistId}).`
      }));

      setImportedTasks(tasks);
      alert(`Successfully imported "${playlistTitle}" with ${tasks.length} videos! Click 'Create Track' to save it.`);
    } catch (err) {
      console.error("YouTube playlist parsing failed:", err);
      
      const confirmFallback = window.confirm(`Import failed during parsing: ${err.message || err}\n\nWould you like to generate a placeholder playlist track with 20 blank video items instead?`);
      if (confirmFallback) {
        generatePlaceholderTrack();
      }
    } finally {
      setIsImporting(false);
    }
  };

  const generatePlaceholderTrack = () => {
    const placeholderTasks = [];
    for (let i = 1; i <= 20; i++) {
      placeholderTasks.push({
        id: `placeholder-video-${Date.now()}-${i}`,
        text: `Video ${i} (Pending Import)`,
        completed: false
      });
    }
    setNewTrack(prev => ({
      ...prev,
      title: "Imported Playlist (Pending)",
      target: 20,
      unit: "Videos",
      description: "YouTube playlist placeholder (auto-import failed)."
    }));
    setImportedTasks(placeholderTasks);
  };

  const handleSourceImport = (htmlContent) => {
    setPlaylistSourceText(htmlContent);
    if (!htmlContent.trim()) return;

    // A. Check if the input is a JSON string from our helper console script
    try {
      const json = JSON.parse(htmlContent.trim());
      if (Array.isArray(json)) {
        const tasks = json.map((item, idx) => {
          const rawTitle = item.title || item.text || `Video ${idx + 1}`;
          const rawDuration = item.duration || item.length || "0:00";
          const title = String(rawTitle).trim();
          const duration = String(rawDuration).trim().replace(/\s+/g, " ");
          
          return {
            id: `yt-video-console-${Date.now()}-${idx}-${Math.random().toString().split(".")[1]}`,
            title: `${item.title} (${item.duration || "0:00"})`,
            status: "Not Started",
            confidence: 0,
            timeSpentMins: 0,
            notes: "",
            keyTakeaway: "",
            actionItem: "",
            dateCompleted: null
          };
        }).filter(t => t.title.trim());

        if (tasks.length > 0) {
          setNewTrack(prev => ({
            ...prev,
            title: newTrack.title || "Scraped Playlist Import",
            target: tasks.length,
            unit: "Videos",
            description: `YouTube playlist imported via JS Console snippet (${tasks.length} items).`
          }));
          setImportedTasks(tasks);
          return;
        }
      }
    } catch (e) {
      // Not JSON, fall back to parsing HTML source code below
    }

    // B. Parse raw HTML page source
    try {
      let jsonStr = null;
      const match = htmlContent.match(/(?:window\["ytInitialData"\]|ytInitialData)\s*=\s*({[\s\S]*?});/);
      if (match) {
        jsonStr = match[1];
      } else {
        const altMatch = htmlContent.match(/(?:window\["ytInitialData"\]|ytInitialData)\s*=\s*({[\s\S]*?})<\/script>/);
        if (altMatch) {
          jsonStr = altMatch[1];
        } else {
          const sliceIndex = htmlContent.indexOf("ytInitialData = {");
          if (sliceIndex !== -1) {
            const startPos = sliceIndex + "ytInitialData = ".length;
            let braceCount = 0;
            let endPos = -1;
            for (let j = startPos; j < htmlContent.length; j++) {
              if (htmlContent[j] === "{") braceCount++;
              if (htmlContent[j] === "}") braceCount--;
              if (braceCount === 0) {
                endPos = j + 1;
                break;
              }
            }
            if (endPos !== -1) {
              jsonStr = htmlContent.substring(startPos, endPos);
            }
          }
        }
      }

      if (!jsonStr) {
        throw new Error("Could not find ytInitialData variables in the pasted content. Ensure you copied the entire page source.");
      }

      const ytData = JSON.parse(jsonStr);

      const tasks = [];
      const findVideos = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (obj.playlistVideoRenderer) {
          const videoRenderer = obj.playlistVideoRenderer;
          const videoId = videoRenderer.videoId;
          const title = videoRenderer.title?.runs?.[0]?.text || `Video ${tasks.length + 1}`;
          const duration = videoRenderer.lengthText?.simpleText || "0:00";
          if (videoId && !tasks.some(t => t.videoId === videoId)) {
            tasks.push({
              id: `yt-video-${videoId}-${Date.now()}-${tasks.length}`,
              title: `${title} (${duration})`,
              status: "Not Started",
              confidence: 0,
              timeSpentMins: 0,
              notes: "",
              keyTakeaway: "",
              actionItem: "",
              dateCompleted: null,
              videoId: videoId
            });
          }
          return;
        }
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            findVideos(obj[key]);
          }
        }
      };

      findVideos(ytData);

      if (tasks.length === 0) {
        throw new Error("No videos found. Ensure this is a valid YouTube playlist page source.");
      }

      let playlistTitle = "Imported Playlist (Source)";
      const findTitle = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (obj.playlistMetadataRenderer && obj.playlistMetadataRenderer.title) {
          playlistTitle = obj.playlistMetadataRenderer.title;
          return;
        }
        if (obj.playlistHeaderRenderer && obj.playlistHeaderRenderer.title?.simpleText) {
          playlistTitle = obj.playlistHeaderRenderer.title.simpleText;
          return;
        }
        if (obj.playlistHeaderRenderer && obj.playlistHeaderRenderer.title?.runs?.[0]?.text) {
          playlistTitle = obj.playlistHeaderRenderer.title.runs[0].text;
          return;
        }
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            findTitle(obj[key]);
          }
        }
      };

      findTitle(ytData);

      setNewTrack(prev => ({
        ...prev,
        title: playlistTitle,
        target: tasks.length,
        unit: "Videos",
        description: `YouTube playlist imported from Page Source.`
      }));

      setImportedTasks(tasks);
    } catch (err) {
      console.error("Source parse error:", err);
      if (htmlContent.length > 500) {
        alert("Failed to parse the pasted text: " + (err.message || err));
      }
    }
  };

  const handleCreateTrack = (e) => {
    e.preventDefault();
    if (!newTrack.title.trim()) return;

    const track = {
      id: "track-" + Date.now(),
      title: newTrack.title.trim(),
      category: newTrack.category,
      target: parseInt(newTrack.target, 10) || 10,
      progress: parseInt(newTrack.progress, 10) || 0,
      unit: newTrack.unit,
      priority: newTrack.priority,
      deadline: newTrack.deadline || new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
      status: "learning",
      description: newTrack.description.trim(),
      createdAt: new Date().toISOString(),
      tasks: newTrack.category === "playlist" && importedTasks.length > 0 ? importedTasks : []
    };

    setTracks(prev => [...prev, track]);
    setNewTrack({
      title: "",
      category: "course",
      target: 50,
      progress: 0,
      unit: "Lessons",
      priority: "medium",
      deadline: "",
      description: ""
    });
    setPlaylistUrl("");
    setImportedTasks([]);
    setPlaylistSourceText("");
    setShowSourceImport(false);
    setShowAddForm(false);
  };

  const deleteTrack = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this track? All associated data will be wiped.")) {
      setTracks(prev => prev.filter(t => t.id !== id));
    }
  };

  const toggleArchiveTrack = (id) => {
    setTracks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === "archived" ? "learning" : "archived";
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  // Edit track handlers
  const startEditing = (track) => {
    setEditingId(track.id);
    setEditForm({ ...track });
  };

  const saveEditing = (e) => {
    e.preventDefault();
    setTracks(prev => prev.map(t => {
      if (t.id === editingId) {
        const progress = parseInt(editForm.progress, 10) || 0;
        const target = parseInt(editForm.target, 10) || 1;
        const status = progress >= target ? "completed" : editForm.status;
        return {
          ...t,
          ...editForm,
          progress,
          target,
          status
        };
      }
      return t;
    }));
    setEditingId(null);
  };

  // --- XLSX / CSV File Import Handler ---
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        if (wb.SheetNames.length === 1) {
          processExcelSheet(file, wb, wb.SheetNames[0]);
        } else {
          setPendingExcelData({ step: "sheet", file, wb, sheetNames: wb.SheetNames });
        }
      } catch (err) {
        console.error("Excel read failed: ", err);
        alert("Failed to read file. Make sure it is a valid .xlsx, .xls, or .csv spreadsheet.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const processExcelSheet = (file, wb, wsname, colIndex = null) => {
    try {
      const ws = wb.Sheets[wsname];
      
      // Read headers and rows
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data.length <= 1) {
        alert("File has insufficient rows. Need at least a header and one data row.");
        return;
      }

      if (colIndex === null) {
        const headerRow = data[0] || [];
        const headers = headerRow.map((col, idx) => ({ name: String(col || `Column ${idx + 1}`).trim(), index: idx })).filter(h => h.name !== "");
        
        if (headers.length > 1) {
          setPendingExcelData({
            step: "column",
            file,
            wb,
            sheetNames: wb.SheetNames,
            selectedSheet: wsname,
            headers
          });
          return;
        } else {
          colIndex = headers.length === 1 ? headers[0].index : 0;
        }
      }

      // Auto-detect a Day or Group column to seamlessly group the syllabus
      let autoGroupColIndex = null;
      const headerRow = data[0] || [];
      const dayHeaderIdx = headerRow.findIndex(h => h && String(h).toLowerCase().trim() === "day");
      if (dayHeaderIdx !== -1) {
        autoGroupColIndex = dayHeaderIdx;
      }

      let lastGroupName = "General";

      const tasks = data.map((row, idx) => {
        if (!row) return null;
        if (idx === 0) return null; // Skip header
        const cell = row[colIndex];
        if (cell === undefined || cell === null) return null;
        const text = String(cell).trim();
        if (!text) return null;

        let url = null;
        try {
          const cellAddress = XLSX.utils.encode_cell({ r: idx, c: colIndex });
          const cellObj = ws[cellAddress];
          if (cellObj && cellObj.l && cellObj.l.Target) url = cellObj.l.Target;
        } catch (e) {}

        if (autoGroupColIndex !== null) {
          const groupCell = row[autoGroupColIndex];
          if (groupCell !== undefined && groupCell !== null && String(groupCell).trim() !== "") {
            lastGroupName = `Day ${String(groupCell).trim()}`;
          }
        }

        const extractTimeMins = (str) => {
          const regex = /(\d+(?:\.\d+)?)\s*(hr|h|min|m|mins|hours|hour)\b/gi;
          let totalMins = 0;
          let match;
          while ((match = regex.exec(str)) !== null) {
            const val = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.startsWith('h')) totalMins += val * 60;
            else if (unit.startsWith('m')) totalMins += val;
          }
          return totalMins > 0 ? Math.round(totalMins) : 0;
        };

        return {
          id: `task-imported-${Date.now()}-${idx}-${Math.random().toString().split(".")[1]}`,
          title: text,
          group: lastGroupName,
          link: url,
          status: "Not Started",
          confidence: 0,
          timeSpentMins: 0,
          targetTimeMins: extractTimeMins(text),
          notes: "",
          dateCompleted: null,
          needsRevision: false
        };
      }).filter(Boolean);

      if (tasks.length === 0) {
        alert("Could not extract any tasks from the selected column.");
        return;
      }

      const title = file.name.replace(/\.[^/.]+$/, "") + (wb.SheetNames.length > 1 ? ` (${wsname})` : "");
      const category = file.name.toLowerCase().includes("dsa") ? "dsa" : "skill";

      const importedTrack = {
        id: "track-excel-" + Date.now(),
        title,
        category,
        target: tasks.length,
        progress: 0,
        unit: category === "dsa" ? "Problems" : "Tasks",
        priority: "medium",
        deadline: new Date(Date.now() + 45*24*60*60*1000).toISOString().split("T")[0],
        status: "learning",
        description: `Spreadsheet Roadmap uploaded from ${file.name} (Sheet: ${wsname}, Col: ${data[0][colIndex] || "Unknown"})`,
        createdAt: new Date().toISOString(),
        tasks: tasks
      };

      setTracks(prev => [...prev, importedTrack]);
      alert(`Successfully imported "${importedTrack.title}" as a track with ${tasks.length} items!`);
      setPendingExcelData(null);
    } catch (err) {
      console.error("Excel import failed: ", err);
      alert("Failed to parse sheet. Error: " + err.message);
    }
  };

  // Toggle milestone sub-checklists inside track
  const toggleMilestone = (trackId, milestoneId) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const updatedTasks = (t.tasks || []).map(m => {
          if (m.id === milestoneId) {
            const isCompleted = ["Completed", "Solved", "Mastered", "Applied"].includes(m.status);
            if (isCompleted) {
              // Remove from dsaProblems
              setDsaProblems(prev => prev.filter(p => p.roadmapTaskId !== `plan-${trackId}::${milestoneId}`));
            }
            return { 
              ...m, 
              status: isCompleted ? "Not Started" : "Completed",
              dateCompleted: isCompleted ? null : new Date().toLocaleDateString("en-CA")
            };
          }
          return m;
        });
        
        const completedCount = updatedTasks.filter(item => 
          ["Completed", "Solved", "Mastered", "Applied"].includes(item.status)
        ).length;

        const progress = completedCount;
        const target = t.category === "project" || t.category === "skill" || t.tasks.length > 0 ? updatedTasks.length : t.target;
        return {
          ...t,
          tasks: updatedTasks,
          progress,
          target,
          status: progress >= target ? "completed" : t.status
        };
      }
      return t;
    }));
  };

  const handleCheckboxClick = (t, task) => {
    const isCompleted = ["Completed", "Solved", "Mastered", "Applied"].includes(task.status);
    if (!isCompleted) {
      setBypassModalData({ 
        trackId: t.id, 
        milestoneId: task.id, 
        title: task.title,
        confidence: 0,
        notes: "",
        keyTakeaway: "",
        timeSpentMins: "",
        difficulty: task.difficulty || "medium"
      });
    } else {
      toggleMilestone(t.id, task.id);
    }
  };

  const handleBypassConfirm = (e) => {
    e.preventDefault();
    if (bypassModalData) {
      const { trackId, milestoneId, title, confidence, notes, keyTakeaway, timeSpentMins, difficulty } = bypassModalData;
      const mins = parseInt(timeSpentMins, 10) || 0;
      const todayStr = new Date().toLocaleDateString("en-CA");

      // Update today's permanent progress if mapped domain exists
      const trackObj = tracks.find(t => t.id === trackId);
      const permKey = trackObj ? getTrackDomain(trackObj) : null;
      if (permKey && mins > 0 && !bypassModalData.alreadyLogged) {
        setTodayPermanentProgress(prev => {
          const newProgress = (prev[permKey] || 0) + mins;
          const target = getPermanentTarget(permKey);
          if (target > 0 && newProgress >= target) {
            setTodayGoalsChecked(goals => ({ ...goals, [permKey]: true }));
          }
          return { ...prev, [permKey]: newProgress };
        });
      }

      setTracks(prev => prev.map(t => {
        if (t.id === trackId) {
          const updatedTasks = (t.tasks || []).map(m => {
            if (m.id === milestoneId) {
              const target = m.targetTimeMins || 0;
              const newTimeSpent = (m.timeSpentMins || 0) + mins;
              const isNowComplete = target === 0 || newTimeSpent >= target;
              return { 
                ...m, 
                status: isNowComplete ? (t.category === "dsa" ? "Solved" : "Completed") : m.status,
                confidence: confidence || m.confidence,
                notes: notes || m.notes,
                keyTakeaway: keyTakeaway || m.keyTakeaway,
                timeSpentMins: newTimeSpent,
                dateCompleted: isNowComplete ? todayStr : m.dateCompleted,
                needsRevision: isNowComplete ? (confidence > 0 && confidence <= 3) : m.needsRevision,
                difficulty: difficulty || m.difficulty || "medium"
              };
            }
            return m;
          });
          
          const completedCount = updatedTasks.filter(item => 
            ["Completed", "Solved", "Mastered", "Applied"].includes(item.status)
          ).length;

          const progress = completedCount;
          const target = t.category === "project" || t.category === "skill" || t.tasks.length > 0 ? updatedTasks.length : t.target;
          return {
            ...t,
            tasks: updatedTasks,
            progress,
            target,
            status: progress >= target ? "completed" : t.status
          };
        }
        return t;
      }));

      // Log the activity log
      const act = {
        id: `act-${Date.now()}`,
        taskId: `plan-${trackId}::${milestoneId}`,
        date: todayStr,
        durationMinutes: bypassModalData.alreadyLogged ? 0 : mins,
        desc: bypassModalData.alreadyLogged ? `Completed "${title}" (Time already tracked)` : `Logged ${mins}m on ${title}`,
        mode: "task",
        confidence: confidence,
        keyTakeaway: keyTakeaway,
        notes: notes,
        trackId: trackId
      };
      setActivityLogs(prev => [...prev, act]);

      // If it's a DSA track/domain, auto-log to dsaProblems list
      if (permKey === "dsa") {
        const problemEntry = {
          id: `prob-${Date.now()}`,
          title: title,
          link: trackObj?.tasks?.find(m => m.id === milestoneId)?.link || "https://leetcode.com/problems",
          difficulty: difficulty || "medium",
          category: trackObj?.title || "Syllabus",
          notes: notes || "",
          solvedAt: todayStr,
          roadmapTaskId: `plan-${trackId}::${milestoneId}`
        };
        setDsaProblems(prev => [problemEntry, ...prev]);
      }

      setBypassModalData(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "dsa": return <Code size={16} style={{ color: "var(--accent)" }} />;
      case "course": return <GraduationCap size={16} style={{ color: "#7fba00" }} />;
      case "playlist": return <PlayCircle size={16} style={{ color: "#a855f7" }} />;
      case "book": return <Book size={16} style={{ color: "#ffb900" }} />;
      case "project": return <Briefcase size={16} style={{ color: "#ec4899" }} />;
      default: return <Wrench size={16} style={{ color: "#94a3b8" }} />;
    }
  };

  // Filtering
  const filteredTracks = tracks.filter(t => {
    const matchesTab = activeTab === "active" 
      ? (t.status === "learning" || t.status === "completed") 
      : t.status === "archived";
    const matchesCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchesTab && matchesCat;
  });

  if (selectedTrackId) {
    return (
      <div className="page-container">
        <TrackDetail trackId={selectedTrackId} onBack={() => setSelectedTrackId(null)} />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Excel Sheet/Column Selector Modal */}
      {pendingExcelData && (
        <>
          <div className="glass-card" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, minWidth: "300px", padding: "1.5rem" }}>
            {pendingExcelData.step === "sheet" ? (
              <>
                <h3 style={{ marginBottom: "1rem" }}>Select Sheet to Import</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  The file "{pendingExcelData.file.name}" has multiple sheets. Which one would you like to import?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", maxHeight: "300px", overflowY: "auto" }}>
                  {pendingExcelData.sheetNames.map(sheetName => (
                    <button 
                      key={sheetName}
                      onClick={() => processExcelSheet(pendingExcelData.file, pendingExcelData.wb, sheetName)}
                      className="btn-secondary"
                      style={{ justifyContent: "flex-start", padding: "0.75rem 1rem", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <Layers size={14} style={{ marginRight: "0.5rem", color: "var(--accent)" }} />
                      {sheetName}
                    </button>
                  ))}
                </div>
              </>
            ) : pendingExcelData.step === "column" && (
                <>
                <h3 style={{ marginBottom: "1rem" }}>Select Task Column</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Which column contains the tasks or problem names you want to track from "{pendingExcelData.selectedSheet}"?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", maxHeight: "300px", overflowY: "auto" }}>
                  {pendingExcelData.headers.map(header => (
                    <button 
                      key={header.index}
                      onClick={() => processExcelSheet(pendingExcelData.file, pendingExcelData.wb, pendingExcelData.selectedSheet, header.index)}
                      className="btn-secondary"
                      style={{ justifyContent: "flex-start", padding: "0.75rem 1rem", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <Layers size={14} style={{ marginRight: "0.5rem", color: "var(--accent)" }} />
                      {header.name}
                    </button>
                  ))}
                </div>
                </>
              )}
            <button 
              onClick={() => setPendingExcelData(null)}
              className="btn-secondary"
              style={{ width: "100%", justifyContent: "center", border: "1px solid rgba(255,100,100,0.3)" }}
            >
              Cancel
            </button>
          </div>
          <div 
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 999 }}
            onClick={() => setPendingExcelData(null)}
          />
        </>
      )}

      <div className="page-header">
        <div>
          <h2>Tracks Management Console</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Unified learning tracks registry. Striver DSA grids, books, playlists, and portfolio projects are managed here.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {/* Offline spreadsheet upload */}
          <label className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
            <Upload size={14} />
            <span>Excel / CSV Import</span>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleExcelUpload}
              style={{ display: "none" }}
            />
          </label>

          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Plus size={14} />
            <span>New Track</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("active")}
          className="btn-secondary"
          style={{
            background: activeTab === "active" ? "rgba(var(--accent-rgb), 0.12)" : "rgba(255,255,255,0.03)",
            borderColor: activeTab === "active" ? "var(--accent)" : "var(--card-border)",
            color: activeTab === "active" ? "#fff" : "var(--text-secondary)",
            padding: "0.4rem 1rem",
            fontSize: "0.8rem"
          }}
        >
          🎯 Active Syllabus Tracks
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className="btn-secondary"
          style={{
            background: activeTab === "archived" ? "rgba(var(--accent-rgb), 0.12)" : "rgba(255,255,255,0.03)",
            borderColor: activeTab === "archived" ? "var(--accent)" : "var(--card-border)",
            color: activeTab === "archived" ? "#fff" : "var(--text-secondary)",
            padding: "0.4rem 1rem",
            fontSize: "0.8rem"
          }}
        >
          📂 Archived Catalog
        </button>
      </div>

      {/* Categories Filter list */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "0.5rem 0" }}>
        {[
          { id: "all", label: "All Types" },
          { id: "dsa", label: "DSA sheets" },
          { id: "course", label: "Courses" },
          { id: "playlist", label: "YouTube Playlists" },
          { id: "book", label: "Books" },
          { id: "project", label: "Projects" },
          { id: "skill", label: "Skills / Certs" }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              border: "1px solid",
              borderColor: categoryFilter === cat.id ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: categoryFilter === cat.id ? "#fff" : "var(--text-secondary)",
              background: categoryFilter === cat.id ? "rgba(var(--accent-rgb), 0.1)" : "rgba(0,0,0,0.15)",
              cursor: "pointer"
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleCreateTrack} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--accent)" }}>
          <div className="glass-card-header">
            <h3>Configure Outcomes Track</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Track Title</label>
              <input 
                type="text"
                value={newTrack.title}
                onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                placeholder="e.g. Striver's A2Z DSA"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Category</label>
              <select value={newTrack.category} onChange={(e) => handleCategoryChange(e.target.value)}>
                <option value="dsa">DSA Practice</option>
                <option value="course">Course</option>
                <option value="playlist">YouTube Playlist</option>
                <option value="book">Book Tracker</option>
                <option value="project">Project Portfolio</option>
                <option value="skill">Skill / Cert</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Target Capacity</label>
              <input 
                type="number"
                value={newTrack.target}
                onChange={(e) => setNewTrack({ ...newTrack, target: e.target.value })}
                min="1"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Unit</label>
              <input 
                type="text"
                value={newTrack.unit}
                onChange={(e) => setNewTrack({ ...newTrack, unit: e.target.value })}
                placeholder="e.g. Problems, Pages"
                required
              />
            </div>
          </div>

          {newTrack.category === "playlist" && (
            <div className="glass-card" style={{ background: "rgba(168, 85, 247, 0.05)", border: "1px dashed rgba(168, 85, 247, 0.3)", padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#a855f7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>YouTube Playlist Importer</span>
                <button 
                  type="button" 
                  onClick={() => setShowSourceImport(!showSourceImport)} 
                  style={{ background: "transparent", color: "var(--accent)", fontSize: "0.7rem", textDecoration: "underline", padding: 0 }}
                >
                  {showSourceImport ? "← Switch to URL Auto-Import" : "Use Page Source (Backup / Offline)"}
                </button>
              </div>

              {!showSourceImport ? (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input 
                    type="text" 
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    placeholder="Paste YouTube Playlist URL (e.g. https://www.youtube.com/playlist?list=...)"
                    style={{ flex: 1, fontSize: "0.80rem", padding: "0.55rem 0.8rem" }}
                  />
                  <button 
                    type="button" 
                    onClick={handleImportPlaylist} 
                    disabled={isImporting}
                    className="btn-primary"
                    style={{ 
                      background: "#a855f7", 
                      color: "#fff", 
                      fontSize: "0.8rem", 
                      padding: "0.55rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin" style={{ width: "12px", height: "12px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", marginRight: "4px" }}></div>
                        <span>Importing...</span>
                      </>
                    ) : (
                      <span>⚡ Auto-Import URL</span>
                    )}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    YouTube limits raw page source to <strong>100 videos</strong>. To import <strong>all videos</strong> (any size):
                    <ol style={{ margin: "4px 0 0 1rem", padding: 0 }}>
                      <li>Scroll down the playlist on YouTube to load all videos.</li>
                      <li>Press <strong>F12</strong> (Console tab), paste this code, and press Enter:</li>
                    </ol>
                    <pre style={{ 
                      background: "rgba(0,0,0,0.5)", 
                      padding: "0.45rem", 
                      borderRadius: "4px", 
                      fontSize: "0.68rem", 
                      margin: "4px 0 6px 0", 
                      color: "var(--accent)", 
                      overflowX: "auto", 
                      fontFamily: "var(--font-mono)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      userSelect: "all"
                    }}>
                      {`copy((()=>{const p=document.querySelector('ytd-playlist-video-list-renderer, ytd-playlist-panel-renderer, yt-item-section-renderer[data-target-id^="PL"]');return Array.from((p||document).querySelectorAll('ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer, yt-lockup-view-model')).map(c=>{const t=c.querySelector('#video-title, .ytLockupMetadataViewModelHeadingReset');const d=c.querySelector('ytd-thumbnail-overlay-time-status-renderer, badge-shape, .badge-shape-wiz__text');return t?{title:t.innerText.trim()||t.title,duration:d?d.innerText.trim():"0:00"}:null}).filter(x=>x&&x.title)})())`}
                    </pre>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                      3. Paste the copied list (automatically copied to your clipboard) below:
                    </div>
                  </div>
                  <textarea
                    value={playlistSourceText}
                    onChange={(e) => handleSourceImport(e.target.value)}
                    placeholder="Paste copied content here (or paste full HTML source)..."
                    rows={4}
                    style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--card-border)", borderRadius: "4px", padding: "0.5rem" }}
                  />
                </div>
              )}

              {importedTasks.length > 0 ? (
                <div style={{ fontSize: "0.75rem", color: "#7fba00", fontWeight: "bold" }}>
                  ✓ Loaded {importedTasks.length} videos successfully! Click "Create Track" to save.
                </div>
              ) : (
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Note: Playlists must be public or unlisted. If CORS proxies fail, copy-pasting the page source works 100% of the time.
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Priority</label>
              <select value={newTrack.priority} onChange={(e) => setNewTrack({ ...newTrack, priority: e.target.value })}>
                <option value="high">🔥 High Priority</option>
                <option value="medium">⚡ Medium Priority</option>
                <option value="low">💤 Low Priority</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Deadline</label>
              <input 
                type="date"
                value={newTrack.deadline}
                onChange={(e) => setNewTrack({ ...newTrack, deadline: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Short Description</label>
              <input 
                type="text"
                value={newTrack.description}
                onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
                placeholder="Key goals of this syllabus path"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Track</button>
          </div>
        </form>
      )}

      {/* Edit Modal (Inline when selected) */}
      {editingId && (
        <form onSubmit={saveEditing} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--ms-yellow)", marginTop: "1rem" }}>
          <div className="glass-card-header">
            <h3 style={{ color: "var(--ms-yellow)" }}>Edit Track Settings</h3>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Track Title</label>
              <input 
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Category</label>
              <select value={editForm.category} onChange={(e) => handleCategoryChange(e.target.value, true)}>
                <option value="dsa">DSA Practice</option>
                <option value="course">Course</option>
                <option value="playlist">YouTube Playlist</option>
                <option value="book">Book Tracker</option>
                <option value="project">Project Portfolio</option>
                <option value="skill">Skill / Cert</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Target</label>
              <input 
                type="number"
                value={editForm.target}
                onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Unit</label>
              <input 
                type="text"
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Current Progress</label>
              <input 
                type="number"
                value={editForm.progress}
                onChange={(e) => setEditForm({ ...editForm, progress: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Priority</label>
              <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Deadline</label>
              <input 
                type="date"
                value={editForm.deadline}
                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Desc</label>
              <input 
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" style={{ background: "var(--ms-yellow)", color: "#000" }}>Save</button>
          </div>
        </form>
      )}

      {/* Grid of tracks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
        {filteredTracks.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: "span 3", textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
            No tracks in this category. Click New Track or Upload Excel to start.
          </div>
        ) : (
          filteredTracks.map(t => {
            const pct = Math.min(100, Math.round((t.progress / t.target) * 100)) || 0;
            
            // Completion Prediction calculations
            const daysElapsed = Math.max(
              1, 
              Math.round((new Date() - new Date(t.createdAt || Date.now() - 5*24*60*60*1000)) / (1000 * 3600 * 24))
            );
            const rate = parseFloat((t.progress / daysElapsed).toFixed(2));
            const remainingUnits = t.target - t.progress;
            const predictedDays = rate > 0 ? Math.ceil(remainingUnits / rate) : null;

            return (
              <div 
                key={t.id} 
                className="glass-card" 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.6rem",
                  borderLeft: `3px solid ${pct >= 100 ? "#7fba00" : t.priority === "high" ? "#f25022" : "var(--accent)"}`
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {t.category === "dsa" ? <Code size={20} color="var(--ms-green)" /> :
                     t.category === "course" ? <GraduationCap size={20} color="var(--ms-blue)" /> :
                     t.category === "book" ? <Book size={20} color="var(--ms-yellow)" /> :
                     t.category === "project" ? <Briefcase size={20} color="var(--meta-blue)" /> :
                     t.category === "playlist" ? <PlayCircle size={20} color="var(--netflix-red)" /> :
                     <Layers size={20} color="var(--accent)" />}
                    <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{t.title}</h3>
                  </div>
                </div>
                
                {/* Action Buttons Overlay */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button onClick={() => setSelectedTrackId(t.id)} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Layers size={14} /> Open
                  </button>
                  <button onClick={() => startEditing(t)} className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button onClick={() => deleteTrack(t.id)} className="btn-danger" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {t.description && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", margin: "-2px 0 2px 0" }}>
                    "{t.description}"
                  </p>
                )}

                {/* Predictor banner */}
                {pct < 100 && (
                  <div style={{
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.02)",
                    borderRadius: "4px",
                    padding: "0.4rem",
                    fontSize: "0.7rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <span>Rate: <strong>{rate}</strong> {t.unit}/day</span>
                    <span>Predicted completion: <strong>{predictedDays !== null ? `${predictedDays} days` : "Infinite"}</strong></span>
                  </div>
                )}

                {/* Progress bar */}
                <div style={{ marginTop: "auto" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Deadline: <strong>{t.deadline || "No deadline"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "6px", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {t.progress} / {t.target} {t.unit}
                      {(!t.tasks || t.tasks.length === 0) && (
                        <button 
                          onClick={() => {
                            const val = window.prompt(`Enter new progress (out of ${t.target} ${t.unit}):`, t.progress);
                            if (val !== null && !isNaN(parseInt(val, 10))) {
                              setTracks(prev => prev.map(trk => trk.id === t.id ? { ...trk, progress: parseInt(val, 10) } : trk));
                            }
                          }}
                          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: "0.65rem" }}
                        >
                          Update
                        </button>
                      )}
                    </span>
                    <span style={{ fontWeight: "bold", color: pct >= 100 ? "#7fba00" : "var(--accent)" }}>{pct}%</span>
                  </div>
                  <div className="milestone-bar-bg" style={{ height: "4px" }}>
                    <div className="milestone-bar-fill" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#7fba00" : "var(--accent)" }}></div>
                  </div>
                </div>

                {/* Milestones / imported roadmap items checklist */}
                {t.tasks && t.tasks.length > 0 && (
                  <div style={{ 
                    borderTop: "1px solid rgba(255,255,255,0.03)", 
                    paddingTop: "0.5rem", 
                    marginTop: "0.4rem" 
                  }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold", display: "block", marginBottom: "4px" }}>
                      Syllabus Checklist ({t.tasks.filter(tk => ["Completed", "Solved", "Mastered", "Applied"].includes(tk.status)).length}/{t.tasks.length})
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                      {Object.entries(t.tasks.reduce((acc, task) => {
                        const g = task.group || "General";
                        if (!acc[g]) acc[g] = [];
                        acc[g].push(task);
                        return acc;
                      }, {})).map(([groupName, groupTasks]) => (
                        <div key={groupName} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {groupName !== "General" && (
                            <span style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: "bold", padding: "2px 0", borderBottom: "1px solid rgba(var(--accent-rgb), 0.2)", marginBottom: "2px" }}>
                              {groupName}
                            </span>
                          )}
                          {groupTasks.map(task => {
                            const isCompleted = ["Completed", "Solved", "Mastered", "Applied"].includes(task.status);
                            return (
                              <label key={task.id} className={`custom-checkbox ${isCompleted ? "checked" : ""}`} style={{ padding: "3px 4px", fontSize: "0.7rem", background: "rgba(0,0,0,0.1)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <input 
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={() => handleCheckboxClick(t, task)}
                                />
                                <div className="checkbox-box" style={{ width: 10, height: 10, opacity: isCompleted ? 0.5 : 1 }}></div>
                                {!isCompleted && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startTrackTaskFocus(t.id, task.id);
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: currentFocusTask === `plan-${t.id}::${task.id}` ? "var(--accent)" : "rgba(255,255,255,0.4)",
                                      cursor: "pointer",
                                      padding: "2px",
                                      display: "flex",
                                      alignItems: "center"
                                    }}
                                    title="Start Focus Session"
                                  >
                                    <PlayCircle size={12} fill={currentFocusTask === `plan-${t.id}::${task.id}` ? "var(--accent)" : "none"} />
                                  </button>
                                )}
                                <span style={{ textDecoration: isCompleted ? "line-through" : "none", color: isCompleted ? "var(--text-muted)" : "var(--text-primary)", flex: 1, display: "flex", alignItems: "center", gap: "5px" }}>
                                  {task.title}
                                  {task.targetTimeMins && task.targetTimeMins > 0 && (
                                    <span style={{ color: "var(--accent)", fontSize: "0.75rem", padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                                      {(() => {
                                        let spent = task.timeSpentMins || 0;
                                        if (currentFocusTask === `plan-${t.id}::${task.id}`) {
                                          spent += activeFocusSession?.verifiedMinutes || 0;
                                        }
                                        return `(${spent}/${task.targetTimeMins}m)`;
                                      })()}
                                    </span>
                                  )}
                                </span>
                                {task.link && (
                                  <a href={task.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", display: "flex", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                  </a>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {bypassModalData && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <form onSubmit={handleBypassConfirm} className="modal-content" style={{ maxWidth: "450px", display: "flex", flexDirection: "column", gap: "1.2rem", textAlign: "left" }}>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "#ff4444", marginBottom: "0.5rem" }}>Manual Completion & Insights</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                Are you lying to yourself? Did you really put in the focused work to earn this completion, or are you just skimming the surface? True progress requires accountability.
              </p>
              <div style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#fff", marginTop: "0.5rem" }}>
                Task: {bypassModalData.title}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Confidence Score (1-5)</label>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setBypassModalData({ ...bypassModalData, confidence: star })}
                     style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Star fill={star <= bypassModalData.confidence ? "#ffb900" : "none"} color={star <= bypassModalData.confidence ? "#ffb900" : "var(--text-muted)"} size={24} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Time Spent (Minutes)</label>
              <input 
                type="number" 
                value={bypassModalData.timeSpentMins}
                onChange={e => setBypassModalData({ ...bypassModalData, timeSpentMins: e.target.value })}
                min="1"
                required
                placeholder="e.g. 30"
                style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.9rem" }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer", marginTop: "0.6rem" }}>
                <input 
                  type="checkbox" 
                  checked={bypassModalData.alreadyLogged || false} 
                  onChange={e => setBypassModalData({ ...bypassModalData, alreadyLogged: e.target.checked })}
                  style={{ accentColor: "var(--accent)" }}
                />
                Time is already logged via focus timer (prevent double counting)
              </label>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Difficulty</label>
              <select 
                value={bypassModalData.difficulty || "medium"}
                onChange={e => setBypassModalData({ ...bypassModalData, difficulty: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.9rem" }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Key Takeaway (Optional)</label>
               <input 
                type="text" 
                value={bypassModalData.keyTakeaway}
                onChange={e => setBypassModalData({ ...bypassModalData, keyTakeaway: e.target.value })}
                placeholder="Main concept you learned..."
                style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.9rem" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Notes / Reflection (Optional)</label>
              <textarea 
                value={bypassModalData.notes}
                onChange={e => setBypassModalData({ ...bypassModalData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", resize: "none", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, background: "#ff4444", borderColor: "#ff4444", color: "#fff", padding: "0.6rem" }}>
                Save Completion
              </button>
              <button type="button" onClick={() => setBypassModalData(null)} className="btn-secondary" style={{ flex: 1, padding: "0.6rem" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}