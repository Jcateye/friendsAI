import Taro from '@tarojs/taro'

// H5 runtime may not define `process`, so guard access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string>
const resolveBaseUrl = () => {
  if (env.TARO_APP_API_BASE_URL) return env.TARO_APP_API_BASE_URL
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3000/v1`
  }
  return 'http://localhost:3000/v1'
}
const BASE_URL = resolveBaseUrl()

type OutboxKind = 'contact_create' | 'contact_update' | 'journal_create'

export interface OutboxItem {
  id: string
  kind: OutboxKind
  url: string
  method: 'POST' | 'PATCH'
  data: any
  createdAt: string
}

const KEYS = {
  outbox: 'outbox',
  contacts: 'contacts_cache_raw',
  journals: 'journals_cache_raw',
}

const getJson = <T,>(key: string, fallback: T): T => {
  try {
    if (typeof Taro.getStorageSync !== 'function') return fallback
    const v = Taro.getStorageSync(key)
    if (!v) return fallback
    return v as T
  } catch (err) {
    return fallback
  }
}

const setJson = (key: string, value: any) => {
  try {
    if (typeof Taro.setStorageSync !== 'function') return
    Taro.setStorageSync(key, value)
  } catch (err) {
    // ignore
  }
}

export const generateId = () => {
  try {
    // H5 typically has crypto.randomUUID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis as any
    if (c.crypto?.randomUUID) {
      return c.crypto.randomUUID()
    }
  } catch (err) {
    // ignore
  }
  // Fallback: uuid v4 generator
  // eslint-disable-next-line no-bitwise
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const getContactsCacheRaw = () => getJson<any[]>(KEYS.contacts, [])
export const setContactsCacheRaw = (items: any[]) => setJson(KEYS.contacts, items)

export const getJournalsCacheRaw = () => getJson<any[]>(KEYS.journals, [])
export const setJournalsCacheRaw = (items: any[]) => setJson(KEYS.journals, items)

export const getOutbox = () => getJson<OutboxItem[]>(KEYS.outbox, [])

export const enqueueOutbox = (item: OutboxItem) => {
  const outbox = getOutbox()
  setJson(KEYS.outbox, [...outbox, item])
}

export const flushOutbox = async () => {
  if (typeof Taro.getStorageSync !== 'function' || typeof Taro.request !== 'function') {
    return
  }
  const token = Taro.getStorageSync('token')
  if (!token) {
    return
  }

  const outbox = getOutbox()
  if (outbox.length === 0) {
    return
  }

  const remaining: OutboxItem[] = []

  for (const item of outbox) {
    try {
      const resp = await Taro.request({
        url: `${BASE_URL}${item.url}`,
        method: item.method,
      data: item.data,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        continue
      }
      remaining.push(item)
    } catch (err) {
      remaining.push(item)
    }
  }

  setJson(KEYS.outbox, remaining)
}
