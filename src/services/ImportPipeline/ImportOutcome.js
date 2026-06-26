/**
 * Represents the final outcome of executing the import pipeline.
 * Serves as a formal versioned contract returned to callers.
 */
export class ImportOutcome {
  constructor({
    success,
    track = null,
    errors = [],
    warnings = [],
    summary = {},
    contractVersion = "1.0.0"
  }) {
    this.success = !!success;
    this.track = track;
    this.errors = errors; // Array of { code, message, rowNumber }
    this.warnings = warnings; // Array of { code, message, rowNumber }
    this.summary = {
      totalRows: summary.totalRows || 0,
      validCount: summary.validCount || 0,
      invalidCount: summary.invalidCount || 0,
      modulesCount: summary.modulesCount || 0,
      lessonsCount: summary.lessonsCount || 0,
      duplicatesCount: summary.duplicatesCount || 0,
      warningsCount: summary.warningsCount || 0,
      errorsCount: summary.errorsCount || 0
    };
    this.contractVersion = contractVersion;
  }
}
