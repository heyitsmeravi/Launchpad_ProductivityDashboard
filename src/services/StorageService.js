export class LocalStorageAdapter {
  read(key, defaultValue) {
    if (typeof localStorage === "undefined") {
      return defaultValue;
    }
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) {
        return defaultValue;
      }
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback: return raw string if JSON parsing fails (e.g. legacy plain text string keys like lp_os_version)
        return saved;
      }
    } catch (e) {
      console.error(`Error reading key ${key} from localStorage:`, e);
      return defaultValue;
    }
  }

  write(key, data) {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error writing key ${key} to localStorage:`, e);
    }
  }

  delete(key) {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error deleting key ${key} from localStorage:`, e);
    }
  }

  clear() {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.clear();
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
  }
}

class StorageServiceClass {
  constructor(adapter = new LocalStorageAdapter()) {
    this.adapter = adapter;
  }

  setAdapter(adapter) {
    this.adapter = adapter;
  }

  read(key, defaultValue) {
    return this.adapter.read(key, defaultValue);
  }

  write(key, data) {
    return this.adapter.write(key, data);
  }

  delete(key) {
    return this.adapter.delete(key);
  }

  clear() {
    return this.adapter.clear();
  }
}

export const StorageService = new StorageServiceClass();
