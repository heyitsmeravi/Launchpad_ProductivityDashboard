/**
 * Configurable weights for the recommendation scoring engine.
 * These can be adjusted externally without changing the core engine logic.
 */
export const DEFAULT_ENGINE_CONFIG = {
  weights: {
    priority: 0.25,
    deadline: 0.30,
    neglect: 0.20,
    revision: 0.15,
    velocity: 0.10
  },
  thresholds: {
    neglectMinsWeekly: 120, // default target minutes per category per week
    criticalDaysRemaining: 7
  }
};

/**
 * Learning Intelligence Engine (LaunchPad 2.0)
 * Centralizes scoring algorithms, paced deadlines, revisions, and optimal study actions.
 */
class LearningIntelligenceEngineClass {
  constructor(config = DEFAULT_ENGINE_CONFIG) {
    this.config = config;
    this.contractVersion = "1.0.0";
  }

  /**
   * Evaluates the active tracks, activity history, and settings to build a complete learning state.
   * 
   * @param {Array} tracks - Current normalized track models.
   * @param {Array} activityLogs - Focus activity logs.
   * @param {Object} settings - User settings parameters.
   * @returns {Object} A structured LearningState object.
   */
  analyzeLearningState(tracks, activityLogs, settings) {
    const activeTracks = (tracks || []).filter(t => t && t.status === "learning");
    const now = new Date();
    
    // 1. Gather rolling 7-day study minutes per category (Neglect Analysis)
    const categoryMinutes = { dsa: 0, development: 0, learning: 0 };
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    
    (activityLogs || []).forEach(log => {
      if (!log) return;
      const logTime = new Date(log.date || log.createdAt).getTime();
      if (logTime >= sevenDaysAgo) {
        const cat = log.category || (log.mode === "dsa" ? "dsa" : "learning");
        // Normalize categories to core types
        const cleanCat = (cat === "course" || cat === "skill" || cat === "playlist") 
          ? "learning" 
          : (cat === "project" ? "development" : cat);
          
        if (categoryMinutes[cleanCat] !== undefined) {
          categoryMinutes[cleanCat] += log.durationMinutes || log.verifiedMinutes || 0;
        }
      }
    });

    const neglectedCategories = [];
    const targets = {
      dsa: parseInt(settings?.dsaTarget, 10) * 60 || this.config.thresholds.neglectMinsWeekly,
      development: parseInt(settings?.devTarget, 10) * 60 || this.config.thresholds.neglectMinsWeekly,
      learning: parseInt(settings?.learnTarget, 10) * 60 || this.config.thresholds.neglectMinsWeekly
    };

    Object.keys(targets).forEach(cat => {
      const minutesSpent = categoryMinutes[cat] || 0;
      const targetVal = targets[cat] || this.config.thresholds.neglectMinsWeekly;
      if (minutesSpent < targetVal) {
        neglectedCategories.push(cat);
      }
    });

    // 2. Spaced Repetition (Revision Queue Analysis)
    const revisionCandidates = [];
    // 3. Pacing & At-Risk Tracks Analysis
    const atRiskTracks = [];
    const pacingProjections = [];

    activeTracks.forEach(track => {
      const deadlineDate = new Date(track.deadline);
      const daysRemaining = Math.max(1, Math.round((deadlineDate - now) / (1000 * 3600 * 24)));
      
      const totalLessons = (track.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0);
      const completedLessons = (track.modules || []).reduce((sum, m) => sum + (m.lessons || []).filter(l => l.completed).length, 0);
      const remainingLessons = totalLessons - completedLessons;

      // Calculate track velocity (rolling average)
      const createdTime = new Date(track.createdAt || now.getTime() - 5 * 24 * 60 * 60 * 1000).getTime();
      const daysElapsed = Math.max(1, Math.round((now.getTime() - createdTime) / (1000 * 3600 * 24)));
      const actualVelocity = completedLessons / daysElapsed; // lessons per day

      const velocity = Math.max(0.1, actualVelocity);
      const daysToComplete = remainingLessons / velocity;
      
      const predictedDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
      const bufferDays = daysRemaining - daysToComplete;

      const projection = {
        trackId: track.id,
        trackTitle: track.title,
        velocity: parseFloat(velocity.toFixed(3)),
        predictedCompletionDate: predictedDate.toISOString().split("T")[0],
        daysRemaining,
        bufferDays: Math.round(bufferDays)
      };
      
      pacingProjections.push(projection);

      if (bufferDays < 0 && remainingLessons > 0) {
        atRiskTracks.push({
          trackId: track.id,
          trackTitle: track.title,
          deadline: track.deadline,
          bufferDays: Math.round(bufferDays)
        });
      }

      // Collect low confidence / revision flagged items
      (track.modules || []).forEach(mod => {
        (mod.lessons || []).forEach(lesson => {
          if (lesson.completed && (lesson.needsRevision || (lesson.confidence > 0 && lesson.confidence <= 2))) {
            const completedTime = lesson.dateCompleted ? new Date(lesson.dateCompleted).getTime() : createdTime;
            const daysSinceCompleted = Math.max(0, Math.round((now.getTime() - completedTime) / (1000 * 3600 * 24)));
            revisionCandidates.push({
              lessonId: lesson.id,
              trackId: track.id,
              trackTitle: track.title,
              lessonTitle: lesson.title,
              confidence: lesson.confidence || 0,
              daysSinceCompleted
            });
          }
        });
      });
    });

    // Sort revision candidates (longest neglected revision first)
    const revisionQueue = revisionCandidates.sort((a, b) => b.daysSinceCompleted - a.daysSinceCompleted);

    // 4. Candidates Selection & Multi-Signal Scoring Engine
    const candidates = [];
    activeTracks.forEach(track => {
      (track.modules || []).forEach(mod => {
        const firstUncompleted = (mod.lessons || []).find(lesson => !lesson.completed);
        if (firstUncompleted) {
          candidates.push({
            track,
            module: mod,
            lesson: firstUncompleted
          });
        }
      });
    });

    const recommendations = candidates.map(cand => {
      const { track, lesson } = cand;
      
      // Signal A: Track Priority (high = 1.0, medium = 0.6, low = 0.2)
      const priorityMap = { high: 1.0, medium: 0.6, low: 0.2 };
      const s_priority = priorityMap[track.priority] || 0.6;

      // Signal B: Deadline Urgency
      const deadlineDate = new Date(track.deadline);
      const daysRemaining = Math.max(1, Math.round((deadlineDate - now) / (1000 * 3600 * 24)));
      const totalLessons = (track.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0);
      const completedLessons = (track.modules || []).reduce((sum, m) => sum + (m.lessons || []).filter(l => l.completed).length, 0);
      const remainingLessons = totalLessons - completedLessons;
      
      const createdTime = new Date(track.createdAt || now.getTime() - 5 * 24 * 60 * 60 * 1000).getTime();
      const daysElapsed = Math.max(1, Math.round((now.getTime() - createdTime) / (1000 * 3600 * 24)));
      const actualVelocity = completedLessons / daysElapsed;
      const requiredRate = remainingLessons / daysRemaining;

      let s_deadline = 0.0;
      if (remainingLessons > 0) {
        if (daysRemaining <= this.config.thresholds.criticalDaysRemaining) {
          s_deadline = 1.0;
        } else {
          s_deadline = Math.min(1.0, Math.max(0.0, requiredRate / (Math.max(0.1, actualVelocity) * 2)));
        }
      }

      // Signal C: Category Neglect (1.0 - (minsSpent / targetMins))
      const cat = track.category === "dsa" ? "dsa" : (track.category === "project" ? "development" : "learning");
      const minsSpent = categoryMinutes[cat] || 0;
      const targetMins = targets[cat] || this.config.thresholds.neglectMinsWeekly;
      const s_neglect = Math.max(0.0, Math.min(1.0, 1.0 - (minsSpent / targetMins)));

      // Signal D: Revision Urgency
      let s_revision = 0.0;
      if (lesson.needsRevision) {
        s_revision = 1.0;
      } else if (lesson.confidence > 0 && lesson.confidence <= 2) {
        s_revision = 0.8;
      } else if (lesson.confidence === 3) {
        s_revision = 0.4;
      }

      // Signal E: Learning Velocity (positive momentum boost if active in last 3 days)
      let s_velocity = 0.0;
      const threeDaysAgo = now.getTime() - 3 * 24 * 60 * 60 * 1000;
      const hasRecentActivity = (activityLogs || []).some(log => {
        return log && log.trackId === track.id && new Date(log.date || log.createdAt).getTime() >= threeDaysAgo;
      });
      if (hasRecentActivity) {
        s_velocity = 1.0;
      }

      // Combine Signals
      const w = this.config.weights;
      const compositeScore = (
        w.priority * s_priority +
        w.deadline * s_deadline +
        w.neglect * s_neglect +
        w.revision * s_revision +
        w.velocity * s_velocity
      );

      // Estimate confidence matching score (0.0 to 1.0)
      const confidence = parseFloat(Math.min(1.0, Math.max(0.1, compositeScore)).toFixed(3));

      // Translate composite score to human-readable recommendation label
      let confidenceLabel = "💡 Good Next Step";
      if (compositeScore >= 0.8) {
        confidenceLabel = "🎯 Top Priority";
      } else if (compositeScore >= 0.5) {
        confidenceLabel = "⭐ Strong Recommendation";
      }

      // Generate explainable reason
      let reason;
      const maxVal = Math.max(s_priority, s_deadline, s_neglect, s_revision, s_velocity);
      if (maxVal === s_deadline && s_deadline > 0.5) {
        reason = `Selected because the track "${track.title}" is running behind schedule to hit its ${track.deadline} deadline.`;
      } else if (maxVal === s_neglect && s_neglect > 0.5) {
        reason = `Selected to help balance your study routine since you haven't focused on ${cat.toUpperCase()} topics recently.`;
      } else if (maxVal === s_revision && s_revision > 0.5) {
        reason = `Selected to reinforce your knowledge on this topic, as you previously noted a low confidence level.`;
      } else if (maxVal === s_velocity && s_velocity > 0.5) {
        reason = `Selected to ride the wave of your recent momentum on "${track.title}".`;
      } else {
        reason = `This is the next sequential lesson in your priority track "${track.title}".`;
      }

      const estimatedTimeMins = lesson.metadata?.targetTimeMins || 45;
      let expectedImpact = "Finish this module today.";
      if (lesson.needsRevision || (lesson.confidence > 0 && lesson.confidence <= 2)) {
        expectedImpact = "Clear an overdue revision.";
      } else if (s_deadline > 0.5) {
        expectedImpact = "Stay ahead of your deadline.";
      } else if (s_velocity > 0.5) {
        expectedImpact = "Maintain your study streak.";
      }

      return {
        lessonId: lesson.id,
        trackId: track.id,
        lessonTitle: lesson.title,
        trackTitle: track.title,
        reason,
        estimatedTimeMins,
        expectedImpact,
        link: lesson.metadata?.link || "",
        confidence,
        confidenceLabel,
        signals: {
          priority: parseFloat(s_priority.toFixed(3)),
          deadline: parseFloat(s_deadline.toFixed(3)),
          neglect: parseFloat(s_neglect.toFixed(3)),
          revision: parseFloat(s_revision.toFixed(3)),
          velocity: parseFloat(s_velocity.toFixed(3))
        }
      };
    });

    // Sort recommendations by score/confidence descending
    const sortedRecommendations = recommendations.sort((a, b) => b.confidence - a.confidence);
    const mission = sortedRecommendations[0] || null;

    // 5. Generate reusable insights (warnings, recommendations, achievements, habits)
    const insights = [];

    // Add recommendation insights
    if (mission) {
      insights.push({
        type: "recommendation",
        title: "Recommended Next Step",
        text: `Focus on "${mission.lessonTitle}" in track "${mission.trackTitle}" next. It aligns best with your current learning path and priority metrics.`
      });
    }

    if (revisionQueue.length > 0) {
      insights.push({
        type: "recommendation",
        title: "Spaced Repetition Review",
        text: `You have ${revisionQueue.length} lessons flagged for revision. Spend 15 minutes reviewing earlier topics to solidify retention.`
      });
    }

    // Warn for neglected categories
    neglectedCategories.forEach(cat => {
      insights.push({
        type: "warning",
        title: `${cat.toUpperCase()} Focus Neglected`,
        text: `You have studied less than your target time on ${cat.toUpperCase()} this week. Spend 45 minutes on it today to keep your skill balance.`
      });
    });

    // Warn for at-risk tracks
    atRiskTracks.forEach(risk => {
      insights.push({
        type: "warning",
        title: `Track At Risk: ${risk.trackTitle}`,
        text: `Your current progress velocity puts you behind schedule. You are estimated to miss the deadline by ${Math.abs(risk.bufferDays)} days.`
      });
    });

    // Add achievements based on rolling 7-day completed count
    let completedInLast7Days = 0;
    activeTracks.forEach(track => {
      (track.modules || []).forEach(mod => {
        (mod.lessons || []).forEach(lesson => {
          if (lesson.completed && lesson.dateCompleted) {
            const compTime = new Date(lesson.dateCompleted).getTime();
            if (compTime >= sevenDaysAgo) {
              completedInLast7Days++;
            }
          }
        });
      });
    });

    if (completedInLast7Days >= 5) {
      insights.push({
        type: "achievement",
        title: "Sprint Master",
        text: `Excellent learning momentum! You completed ${completedInLast7Days} lessons in the last 7 days.`
      });
    }

    // Add habit insights
    const activeDaysCount = new Set((activityLogs || []).filter(log => {
      if (!log) return false;
      const logTime = new Date(log.date || log.createdAt).getTime();
      return logTime >= sevenDaysAgo;
    }).map(log => {
      const d = log.date || log.createdAt;
      return d ? d.split("T")[0] : "";
    }).filter(Boolean)).size;

    if (activeDaysCount >= 4) {
      insights.push({
        type: "habit",
        title: "Consistent Builder",
        text: `You have studied on ${activeDaysCount} days in the last week. Consistency is the secret to compound progress!`
      });
    }

    return {
      contractVersion: this.contractVersion,
      generatedAt: now.toISOString(),
      mission,
      insights,
      recommendations: sortedRecommendations,
      revisionQueue,
      atRiskTracks,
      neglectedCategories,
      pacing: pacingProjections
    };
  }
}

export const LearningIntelligenceEngine = new LearningIntelligenceEngineClass();
