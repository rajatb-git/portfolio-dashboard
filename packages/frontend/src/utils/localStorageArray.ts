const maxItems = 10;

class LocalStorageArray {
  private static isLocalStorageAvailable = (): boolean => typeof window !== 'undefined';

  private static getArray(key: string): string[] {
    if (!this.isLocalStorageAvailable()) return [];

    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private static setArray(key: string, array: string[]): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(key, JSON.stringify(array));
    }
  }

  static add(key: string, item: string): void {
    if (this.isLocalStorageAvailable()) {
      const array = this.getArray(key);
      const index = array.indexOf(item);
      if (index !== -1) {
        array.splice(index, 1);
      }
      array.unshift(item);

      if (array.length > maxItems) {
        array.pop();
      }

      this.setArray(key, array);
    }
  }

  static remove(key: string, item: string): void {
    if (this.isLocalStorageAvailable()) {
      const array = this.getArray(key);
      const index = array.indexOf(item);

      if (index !== -1) {
        array.splice(index, 1);
        this.setArray(key, array);
      }
    }
  }

  static getAll(key: string): string[] | null {
    if (this.isLocalStorageAvailable()) {
      return this.getArray(key);
    }

    return null;
  }

  static clear(key: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  }
}

export default LocalStorageArray;
