/**
 * Represents the structured preview of an import operation.
 * Serves as a formal versioned contract between parsers/validators and the caller.
 */
export class PreviewModel {
  constructor({
    success,
    errors = [],
    warnings = [],
    detectedModules = [],
    detectedLessons = [],
    duplicates = [],
    statistics = {},
    track = null,
    contractVersion = "1.0.0"
  }) {
    this.success = !!success;
    this.errors = errors; // Array of { code, message, rowNumber }
    this.warnings = warnings; // Array of { code, message, rowNumber }
    this.detectedModules = detectedModules;
    this.detectedLessons = detectedLessons;
    this.duplicates = duplicates;
    this.statistics = {
      totalRows: statistics.totalRows || 0,
      validCount: statistics.validCount || 0,
      invalidCount: statistics.invalidCount || 0,
      modulesCount: statistics.modulesCount || 0,
      lessonsCount: statistics.lessonsCount || 0,
      duplicatesCount: statistics.duplicatesCount || 0,
      warningsCount: statistics.warningsCount || 0,
      errorsCount: statistics.errorsCount || 0
    };
    this.track = track;
    this.contractVersion = contractVersion;
  }
}
