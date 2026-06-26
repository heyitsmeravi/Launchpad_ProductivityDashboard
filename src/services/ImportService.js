import { ExcelParser } from "./ImportPipeline/ExcelParser.js";
import { PlaylistParser } from "./ImportPipeline/PlaylistParser.js";
import { ImportValidator } from "./ImportPipeline/ImportValidator.js";
import { TrackTransformer } from "./ImportPipeline/TrackTransformer.js";
import { normalizeTrack } from "./MigrationService.js";
import { PreviewModel } from "./ImportPipeline/PreviewModel.js";
import { ImportOutcome } from "./ImportPipeline/ImportOutcome.js";

/**
 * Service that orchestrates the staged import pipeline.
 * Gathers parsed documents, validates them, produces preview models,
 * and transforms them into final hierarchical Tracks.
 */
class ImportServiceClass {
  /**
   * Generates a preview model containing validation summaries, detected modules,
   * lessons, duplicates, and warning statistics.
   * 
   * @param {string} source - 'excel' or 'playlist'.
   * @param {Object} args - Parser arguments.
   * @returns {PreviewModel} A structured PreviewModel.
   */
  parseAndValidate(source, args) {
    let doc;
    if (source === "excel") {
      doc = ExcelParser.parse(args.XLSX, args.ws, args.fileName, args.sheetName, args.colIndex);
    } else if (source === "playlist") {
      doc = PlaylistParser.parse(args.url, args.data);
    } else {
      const err = new Error(`Unsupported import source: ${source}`);
      err.code = "IMP-PARSE-003";
      throw err;
    }

    const report = ImportValidator.validate(doc);
    
    let trackPreview = null;
    if (report.errors.length === 0) {
      trackPreview = normalizeTrack(TrackTransformer.transform(doc.metadata, report.validRows));
    }

    const detectedModules = [];
    const detectedLessons = [];
    const duplicates = [];

    const seenLessons = new Set();
    const seenModules = new Set();

    doc.rows.forEach(row => {
      if (row.title) {
        const cleanTitle = row.title.trim();
        if (seenLessons.has(cleanTitle)) {
          duplicates.push(cleanTitle);
        } else {
          seenLessons.add(cleanTitle);
          detectedLessons.push(cleanTitle);
        }
      }
      if (row.moduleName) {
        const cleanMod = row.moduleName.trim();
        if (!seenModules.has(cleanMod)) {
          seenModules.add(cleanMod);
          detectedModules.push(cleanMod);
        }
      }
    });

    return new PreviewModel({
      success: report.errors.length === 0,
      errors: report.errors,
      warnings: report.warnings,
      detectedModules,
      detectedLessons,
      duplicates,
      statistics: {
        totalRows: doc.rows.length,
        validCount: report.validRows.length,
        invalidCount: report.invalidRows.length,
        modulesCount: detectedModules.length,
        lessonsCount: detectedLessons.length,
        duplicatesCount: duplicates.length,
        warningsCount: report.warnings.length,
        errorsCount: report.errors.length
      },
      track: trackPreview
    });
  }

  /**
   * Orchestrates full end-to-end import pipeline to generate a final hierarchical Track model.
   * 
   * @param {string} source - 'excel' or 'playlist'.
   * @param {Object} args - Parser arguments.
   * @returns {ImportOutcome} An ImportOutcome structure containing the Track model and import outcome.
   */
  importTrack(source, args) {
    const previewModel = this.parseAndValidate(source, args);
    if (!previewModel.success) {
      return new ImportOutcome({
        success: false,
        errors: previewModel.errors,
        warnings: previewModel.warnings
      });
    }

    return new ImportOutcome({
      success: true,
      track: previewModel.track,
      errors: [],
      warnings: previewModel.warnings,
      summary: previewModel.statistics
    });
  }
}

export const ImportService = new ImportServiceClass();
