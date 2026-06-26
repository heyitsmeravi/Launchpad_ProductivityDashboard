/**
 * Validates an ImportDocument against standard import rules.
 * Does not silently discard data; gathers all warnings and errors
 * for preview and logging.
 */
export class ImportValidator {
  /**
   * Validates an ImportDocument and returns a structured validation report.
   * 
   * @param {ImportDocument} doc - The document to validate.
   * @returns {Object} Validation report containing errors, warnings, validRows, and summaries.
   */
  static validate(doc) {
    const errors = [];
    const warnings = [...(doc.warnings || [])];
    const validRows = [];
    const invalidRows = [];
    
    if (!doc.schemaVersion || doc.schemaVersion !== 1) {
      warnings.push({
        code: "IMP-VALID-002",
        message: `ImportDocument schema version ${doc.schemaVersion || "undefined"} is unrecognized, parsing as version 1.`,
        rowNumber: null
      });
    }

    if (!doc.rows || doc.rows.length === 0) {
      errors.push({
        code: "IMP-VALID-001",
        message: "No data rows found in the parsed document.",
        rowNumber: null
      });
      return { errors, warnings, validRows, invalidRows, summary: { totalRows: 0, validCount: 0, invalidCount: 0 } };
    }

    const seenLessons = new Set();
    const seenModules = new Set();

    doc.rows.forEach((row, idx) => {
      const lineNum = row.originalIndex || (idx + 1);
      
      // 1. Empty rows check
      if (!row || (!row.title && !row.moduleName && !row.link)) {
        warnings.push({
          code: "IMP-VALID-001",
          message: `Row ${lineNum}: Row is completely empty and was skipped.`,
          rowNumber: lineNum
        });
        invalidRows.push({ row, reason: "Row is empty" });
        return;
      }

      // 2. Required columns check
      if (!row.title || String(row.title).trim() === "") {
        errors.push({
          code: "IMP-VALID-001",
          message: `Row ${lineNum}: Missing required task title/text.`,
          rowNumber: lineNum
        });
        invalidRows.push({ row, reason: "Missing Title" });
        return;
      }

      const cleanTitle = String(row.title).trim();

      // 3. Duplicate lessons check
      if (seenLessons.has(cleanTitle)) {
        warnings.push({
          code: "IMP-VALID-003",
          message: `Row ${lineNum}: Duplicate lesson title found ("${cleanTitle}"). Duplicates will be merged.`,
          rowNumber: lineNum
        });
      } else {
        seenLessons.add(cleanTitle);
      }

      // 4. Missing module name check (informational/warning only, will fall back to "Syllabus Tasks")
      if (doc.source === "excel" && (!row.moduleName || String(row.moduleName).trim() === "")) {
        warnings.push({
          code: "IMP-VALID-004",
          message: `Row ${lineNum}: Missing module name, item will be mapped to "Syllabus Tasks".`,
          rowNumber: lineNum
        });
      } else if (row.moduleName) {
        const cleanModule = String(row.moduleName).trim();
        seenModules.add(cleanModule);
      }

      // 5. Invalid completion date metadata check
      if (row.metadata?.dateCompleted) {
        const d = new Date(row.metadata.dateCompleted);
        if (isNaN(d.getTime())) {
          warnings.push({
            code: "IMP-VALID-005",
            message: `Row ${lineNum}: Invalid completion date format ("${row.metadata.dateCompleted}").`,
            rowNumber: lineNum
          });
        }
      }

      validRows.push(row);
    });

    return {
      errors,
      warnings,
      validRows,
      invalidRows,
      summary: {
        totalRows: doc.rows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        warningsCount: warnings.length,
        errorsCount: errors.length,
        modulesDetected: seenModules.size
      }
    };
  }
}
