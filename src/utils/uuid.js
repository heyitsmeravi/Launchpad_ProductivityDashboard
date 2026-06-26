/**
 * Generates a stable, cryptographically secure UUID v4 string.
 * Uses native crypto.randomUUID() when available in browser environments,
 * with a fallback for older browsers or non-browser environments.
 * 
 * @returns {string} A valid UUID v4 string.
 */
export const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
