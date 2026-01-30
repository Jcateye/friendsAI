import Taro from '@tarojs/taro'

// Navigate to page
export const navigateTo = (url: string) => {
  Taro.navigateTo({ url })
}

// Navigate back
export const navigateBack = () => {
  Taro.navigateBack()
}

// Switch tab
export const switchTab = (url: string) => {
  Taro.switchTab({ url })
}

// Show toast
export const showToast = (title: string, icon: 'success' | 'error' | 'loading' | 'none' = 'none') => {
  Taro.showToast({ title, icon, duration: 2000 })
}

// Show loading
export const showLoading = (title = '加载中...') => {
  Taro.showLoading({ title, mask: true })
}

// Hide loading
export const hideLoading = () => {
  Taro.hideLoading()
}

// Show modal
export const showModal = (title: string, content: string) => {
  return Taro.showModal({ title, content })
}

// Format date
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 14) return '1周前'
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

// Get avatar color by name
export const getAvatarColor = (name: string): string => {
  const colors = ['#C9B8A8', '#7C9070', '#5B9BD5', '#9B8AA8', '#D4845E']
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

// Get initial from name
export const getInitial = (name: string): string => {
  return name.charAt(0)
}

// Storage helpers
export const setStorage = (key: string, data: any) => {
  Taro.setStorageSync(key, data)
}

export const getStorage = <T,>(key: string): T | null => {
  return Taro.getStorageSync(key) || null
}

export const removeStorage = (key: string) => {
  Taro.removeStorageSync(key)
}

// Debounce
export const debounce = <T extends (...args: any[]) => any,>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Get system info
export const getSystemInfo = () => {
  return Taro.getSystemInfoSync()
}

// Get status bar height
export const getStatusBarHeight = (): number => {
  const systemInfo = getSystemInfo()
  return systemInfo.statusBarHeight || 44
}

// Get avatar style by color
export const getAvatarStyle = (avatarColor: string) => {
  return { backgroundColor: avatarColor }
}
