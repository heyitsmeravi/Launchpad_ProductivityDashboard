/**
 * Represents the common intermediate representation of parsed data.
 * All parsers (Excel, YouTube, Vimeo, JSON) must normalize their output to this document structure
 * before it proceeds to the validation and transformation stages.
 */
export class ImportDocument {
  constructor({ source = "unknown", schemaVersion = 1, metadata = {}, rows = [], warnings = [], contractVersion = "1.0.0" }) {
    this.source = source;
    this.schemaVersion = schemaVersion;
    this.metadata = metadata; // e.g. { title, description, category }
    this.rows = rows;         // Array of raw normalized objects: { title, moduleName, link, durationText, originalIndex }
    this.warnings = warnings; // Parser-level warnings: Array of { code, message, rowNumber }
    this.contractVersion = contractVersion;
  }
}
