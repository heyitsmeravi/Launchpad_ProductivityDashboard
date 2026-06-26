import { ImportDocument } from "./ImportDocument.js";

export class ExcelParser {
  /**
   * Parses Excel sheet data to an ImportDocument.
   * 
   * @param {Object} XLSX - The XLSX library object.
   * @param {Object} ws - The worksheet object.
   * @param {string} fileName - File name.
   * @param {string} sheetName - Sheet name.
   * @param {number} colIndex - Index of the main syllabus tasks column.
   * @returns {ImportDocument} The parsed document.
   */
  static parse(XLSX, ws, fileName, sheetName, colIndex) {
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const warnings = [];
    
    if (data.length <= 1) {
      const err = new Error("File has insufficient rows. Need at least a header and one data row.");
      err.code = "IMP-PARSE-001";
      throw err;
    }
    
    const headerRow = data[0] || [];
    
    // Auto-detect group/module columns
    let autoGroupColIndex = null;
    const dayHeaderIdx = headerRow.findIndex(h => h && String(h).toLowerCase().trim() === "day");
    const moduleHeaderIdx = headerRow.findIndex(h => h && ["module", "group", "chapter", "section"].includes(String(h).toLowerCase().trim()));
    
    if (moduleHeaderIdx !== -1) {
      autoGroupColIndex = moduleHeaderIdx;
    } else if (dayHeaderIdx !== -1) {
      autoGroupColIndex = dayHeaderIdx;
    }
    
    let lastGroupName = "";
    const rows = [];
    
    for (let idx = 1; idx < data.length; idx++) {
      const row = data[idx];
      if (!row) {
        warnings.push({
          code: "IMP-PARSE-005",
          message: `Row ${idx + 1} is empty and was ignored.`,
          rowNumber: idx + 1
        });
        continue;
      }
      
      const cell = row[colIndex];
      if (cell === undefined || cell === null || String(cell).trim() === "") {
        warnings.push({
          code: "IMP-VALID-001",
          message: `Row ${idx + 1} has an empty syllabus task cell and was ignored.`,
          rowNumber: idx + 1
        });
        continue;
      }
      
      const text = String(cell).trim();
      
      let url = "";
      try {
        const cellAddress = XLSX.utils.encode_cell({ r: idx, c: colIndex });
        const cellObj = ws[cellAddress];
        if (cellObj && cellObj.l && cellObj.l.Target) {
          url = cellObj.l.Target;
        }
      } catch {
        warnings.push({
          code: "IMP-PARSE-005",
          message: `Row ${idx + 1}: Failed to extract link.`,
          rowNumber: idx + 1
        });
      }
      
      if (autoGroupColIndex !== null) {
        const groupCell = row[autoGroupColIndex];
        if (groupCell !== undefined && groupCell !== null && String(groupCell).trim() !== "") {
          lastGroupName = String(groupCell).trim();
          if (autoGroupColIndex === dayHeaderIdx) {
            lastGroupName = `Day ${lastGroupName}`;
          }
        }
      }
      
      rows.push({
        title: text,
        moduleName: lastGroupName,
        link: url,
        originalIndex: idx
      });
    }
    
    const title = fileName.replace(/\.[^/.]+$/, "") + ` (${sheetName})`;
    const category = fileName.toLowerCase().includes("dsa") ? "dsa" : "skill";
    
    return new ImportDocument({
      source: "excel",
      schemaVersion: 1,
      metadata: {
        title,
        category,
        description: `Spreadsheet Roadmap uploaded from ${fileName} (Sheet: ${sheetName}, Col: ${headerRow[colIndex] || "Unknown"})`
      },
      rows,
      warnings
    });
  }
}
