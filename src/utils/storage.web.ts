// src/utils/storage.web.ts
// Web/H5 storage implementation

/**
 * Set an item in local storage
 * @param key Storage key
 * @param value Value to store
 */
export function setItem(key: string, value: any): void {
  try {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Error setting localStorage item ${key}:`, error);
  }
}

/**
 * Get an item from local storage
 * @param key Storage key
 * @returns Stored value or null if not found
 */
export function getItem(key: string): any {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return null;
    
    // Try to parse as JSON, return as string if parsing fails
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error(`Error getting localStorage item ${key}:`, error);
    return null;
  }
}

/**
 * Remove an item from local storage
 * @param key Storage key
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage item ${key}:`, error);
  }
}

/**
 * Clear all items from local storage
 */
export function clearStorage(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

export default {
  setItem,
  getItem,
  removeItem,
  clearStorage
};