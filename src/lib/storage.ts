/**
 * Utility aman untuk membaca dan menulis localStorage tanpa memicu SyntaxError atau Type Mismatch.
 */

// Membaca string biasa (seperti "dark" / "light") tanpa JSON.parse
export function getStorageString(key: string, fallback: string): string {
  try {
    const value = localStorage.getItem(key);
    if (value === null || value === undefined) return fallback;
    return value;
  } catch (error) {
    console.warn(`[LocalStorage] Gagal membaca key "${key}":`, error);
    return fallback;
  }
}

// Membaca boolean dengan konversi aman dari string "0", "1", "true", "false"
export function getStorageBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    if (value === null || value === undefined) return fallback;
    
    // Tangani kasus khusus string "0" atau "false"
    if (value === "0" || value === "false") return false;
    if (value === "1" || value === "true") return true;
    
    return Boolean(value);
  } catch (error) {
    console.warn(`[LocalStorage] Gagal membaca boolean key "${key}":`, error);
    return fallback;
  }
}

// Membaca JSON object/array secara aman dengan try-catch
export function getStorageJSON<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`[LocalStorage] JSON.parse gagal untuk key "${key}". Menghapus data korup.`, error);
    try {
      localStorage.removeItem(key);
    } catch {}
    return fallback;
  }
}

// Menyimpan nilai ke localStorage secara aman
export function setStorageItem(key: string, value: any): void {
  try {
    if (typeof value === "string") {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`[LocalStorage] Gagal menyimpan key "${key}":`, error);
  }
}
