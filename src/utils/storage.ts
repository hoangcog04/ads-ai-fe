const isJsonString = (str: string) => {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }

  return true
}

const storage = {
  set(key: string, value: any): void {
    localStorage.setItem(key, value)
  },

  get<T>(key: string): T | string | null {
    const value = localStorage.getItem(key)

    if (value == null) return null

    if (!isJsonString(value)) return value as string

    return value
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  },
}

export default storage
