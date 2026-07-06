class LocalStorageUtil {
  private static isLocalStorageAvailable = (): boolean => !!(window && localStorage);

  static setItem(key: string, value: any): void {
    try {
      if (this.isLocalStorageAvailable()) {
        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
      }
    } catch (error: any) {
      console.error(`Error setting item in localStorage: ${error}`);
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      if (!this.isLocalStorageAvailable()) return null;

      const serializedValue = localStorage.getItem(key);
      if (serializedValue === null) {
        return null;
      }
      return JSON.parse(serializedValue) as T;
    } catch (error: any) {
      console.error(`Error getting item from localStorage: ${error}`);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem(key);
      }
    } catch (error: any) {
      console.error(`Error removing item from localStorage: ${error}`);
    }
  }

  static clear(): void {
    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.clear();
      }
    } catch (error: any) {
      console.error(`Error clearing localStorage: ${error}`);
    }
  }
}

export default LocalStorageUtil;
