import { Navigate, useLocation } from 'react-router-dom'

/**
 * 获取认证 token（从 localStorage）
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('token')
}

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 受保护的路由组件
 * 如果用户未登录，重定向到登录页
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const token = getAuthToken()

  // 如果没有 token，重定向到登录页，并保存当前路径以便登录后返回
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

