import { generateUUID } from "../utils/uuid.js";

/**
 * Checks if the track is legacy (flat tasks array and no modules).
 * 
 * @param {Object} track - The track to check.
 * @returns {boolean} True if legacy.
 */
export const isLegacyTrack = (track) => {
  return !!(track && Array.isArray(track.tasks) && !Array.isArray(track.modules));
};

/**
 * Checks if the track is hierarchical (has modules array).
 * 
 * @param {Object} track - The track to check.
 * @returns {boolean} True if hierarchical.
 */
export const isHierarchicalTrack = (track) => {
  return !!(track && Array.isArray(track.modules));
};

/**
 * Normalizes a track to the hierarchical (v8) schema.
 * Supports double-sided adaptation:
 * - If legacy (tasks only), creates virtual modules and sets migrationStatus = 'pending'.
 * - If hierarchical (modules only), recreates virtual flat tasks and sets migrationStatus = 'migrated'.
 * 
 * @param {Object} track - The track to normalize.
 * @returns {Object|null} The normalized track with both tasks and modules populated.
 */
export const normalizeTrack = (track) => {
  if (!track) return null;
  
  // Case A: Hierarchical track (v8)
  if (isHierarchicalTrack(track)) {
    // If it already has both tasks and modules (and tasks is populated), synchronize tasks and modules.
    if (track.tasks && Array.isArray(track.tasks) && track.tasks.length > 0) {
      const taskMap = {};
      track.tasks.forEach(t => {
        if (t && t.id) taskMap[t.id] = t;
      });

      const updatedModules = (track.modules || []).map(mod => {
        const updatedLessons = (mod.lessons || []).map(les => {
          const task = taskMap[les.id];
          if (task) {
            return {
              ...les,
              completed: !!(task.completed || task.status === "Completed" || task.status === "Solved"),
              notes: task.notes || "",
              keyTakeaway: task.keyTakeaway || "",
              dateCompleted: task.dateCompleted,
              needsRevision: !!task.needsRevision,
              confidence: task.confidence || 0,
              timeSpentMins: task.timeSpentMins || 0
            };
          }
          return les;
        });
        return { ...mod, lessons: updatedLessons };
      });

      return {
        ...track,
        modules: updatedModules,
        migrationStatus: track.migrationStatus || "migrated",
        createdAt: track.createdAt || new Date().toISOString()
      };
    }
    
    // Otherwise, recreate legacy tasks from modules lessons so legacy UI components don't crash
    const flatTasks = [];
    (track.modules || []).forEach(mod => {
      (mod.lessons || []).forEach(lesson => {
        flatTasks.push({
          id: lesson.id,
          title: lesson.title,
          text: lesson.title, // legacy text alias
          group: mod.title || "General", // preserve module name as group for legacy rendering
          completed: !!lesson.completed,
          status: lesson.completed ? (track.category === "dsa" ? "Solved" : "Completed") : "Not Started",
          notes: lesson.notes || "",
          keyTakeaway: lesson.keyTakeaway || "",
          dateCompleted: lesson.dateCompleted,
          needsRevision: !!lesson.needsRevision,
          confidence: lesson.completed ? 4 : (lesson.needsRevision ? 1 : 0),
          difficulty: lesson.metadata?.difficulty || "medium",
          link: lesson.metadata?.link || ""
        });
      });
    });
    
    return {
      ...track,
      tasks: flatTasks,
      migrationStatus: track.migrationStatus || "migrated",
      createdAt: track.createdAt || new Date().toISOString(),
      updatedAt: track.updatedAt || new Date().toISOString()
    };
  }
  
  // Case B: Legacy track (v7)
  const legacyTasks = Array.isArray(track.tasks) ? track.tasks : [];
  
  const virtualModule = {
    id: `mod-virtual-${generateUUID()}`,
    title: track.category === "dsa" ? "LeetCode Checklist" : "Syllabus Tasks",
    orderIndex: 0,
    lessons: legacyTasks.map(task => {
      if (!task) return null;
      
      const isCompleted = !!(
        task.completed || 
        task.status === "Completed" || 
        task.status === "Solved"
      );
      
      return {
        id: task.id || generateUUID(),
        title: task.title || task.text || "Untitled Item",
        completed: isCompleted,
        notes: task.notes || "",
        keyTakeaway: task.keyTakeaway || "",
        dateCompleted: task.dateCompleted || (isCompleted ? new Date().toLocaleDateString("en-CA") : null),
        needsRevision: typeof task.needsRevision === "boolean" 
          ? task.needsRevision 
          : !!(task.confidence > 0 && task.confidence <= 3),
        confidence: task.confidence || 0,
        timeSpentMins: task.timeSpentMins || 0,
        metadata: {
          difficulty: task.difficulty || "medium",
          link: task.link || ""
        },
        createdAt: task.createdAt || track.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString(),
        version: 8
      };
    }).filter(Boolean)
  };
  
  return {
    ...track,
    modules: [virtualModule],
    migrationStatus: track.migrationStatus || "pending",
    createdAt: track.createdAt || new Date().toISOString(),
    updatedAt: track.updatedAt || new Date().toISOString()
  };
};

export const MigrationService = {
  isLegacyTrack,
  isHierarchicalTrack,
  normalizeTrack
};
