import { generateUUID } from "../../utils/uuid.js";

/**
 * Transforms parsed and validated intermediate rows into a structured
 * v8 hierarchical Track model, mapping lessons into module checkpoints.
 */
export class TrackTransformer {
  /**
   * Transforms validated intermediate rows to a v8 Hierarchical Track structure.
   * 
   * @param {Object} metadata - Track metadata.
   * @param {Array} validRows - List of validated row objects.
   * @returns {Object} The complete Track structure.
   */
  static transform(metadata, validRows) {
    const modulesMap = new Map(); // moduleName -> list of lessons
    const defaultModuleName = "Syllabus Tasks";

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

    validRows.forEach(row => {
      const moduleName = String(row.moduleName || "").trim() || defaultModuleName;
      
      if (!modulesMap.has(moduleName)) {
        modulesMap.set(moduleName, []);
      }
      
      const lessonsInMod = modulesMap.get(moduleName);
      
      // Avoid duplicate lessons (merge duplicates check)
      const cleanTitle = String(row.title).trim();
      const existingLesson = lessonsInMod.find(l => l.title === cleanTitle);
      
      if (existingLesson) {
        // Merge links / metadata if missing
        if (!existingLesson.metadata.link && row.link) {
          existingLesson.metadata.link = row.link;
        }
        return;
      }
      
      lessonsInMod.push({
        id: generateUUID(),
        title: cleanTitle,
        completed: false,
        notes: "",
        keyTakeaway: "",
        dateCompleted: null,
        needsRevision: false,
        confidence: 0,
        timeSpentMins: 0,
        metadata: {
          difficulty: "medium",
          link: row.link || "",
          targetTimeMins: extractTimeMins(cleanTitle),
          originalIndex: row.originalIndex,
          ...(row.metadata || {}) // Preserve provider-specific metadata (e.g. videoId, durationText)
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 8
      });
    });

    // Convert modulesMap to final Module list
    let orderIndex = 0;
    const modules = [];
    modulesMap.forEach((lessons, title) => {
      modules.push({
        id: `mod-${generateUUID()}`,
        title,
        orderIndex: orderIndex++,
        lessons
      });
    });

    const category = metadata.category || "skill";
    const totalUniqueLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

    return {
      id: "track-imported-" + generateUUID(),
      title: metadata.title || "Imported Track",
      category,
      target: totalUniqueLessons,
      progress: 0,
      unit: category === "dsa" ? "Problems" : "Tasks",
      priority: "medium",
      deadline: new Date(Date.now() + 45*24*60*60*1000).toISOString().split("T")[0],
      status: "learning",
      description: metadata.description || "Imported syllabus roadmap.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migrationStatus: "migrated", // Direct hierarchical structure
      modules
    };
  }
}
