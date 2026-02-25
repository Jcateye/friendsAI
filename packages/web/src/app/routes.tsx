import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'

const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const ChatPage = lazy(() => import('../pages/ChatPage').then((m) => ({ default: m.ChatPage })))
const ConversationDetailPage = lazy(() =>
  import('../pages/ConversationDetailPage').then((m) => ({ default: m.ConversationDetailPage })),
)
const ContactsPage = lazy(() => import('../pages/ContactsPage').then((m) => ({ default: m.ContactsPage })))
const ContactDetailPage = lazy(() =>
  import('../pages/ContactDetailPage').then((m) => ({ default: m.ContactDetailPage })),
)
const ActionsPage = lazy(() => import('../pages/ActionsPage').then((m) => ({ default: m.ActionsPage })))
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const FeishuOAuthCallbackPage = lazy(() =>
  import('../pages/FeishuOAuthCallbackPage').then((m) => ({ default: m.FeishuOAuthCallbackPage })),
)
const SettingsConnectorPage = lazy(() =>
  import('../pages/SettingsConnectorPage').then((m) => ({ default: m.SettingsConnectorPage })),
)

function withSuspense(node: ReactNode) {
  return (
    <Suspense fallback={<div className="p-4 text-text-muted text-sm">加载中...</div>}>
      {node}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: withSuspense(<ChatPage />) },
      { path: 'chat', element: withSuspense(<ChatPage />) },
      { path: 'contacts', element: withSuspense(<ContactsPage />) },
      { path: 'actions', element: withSuspense(<ActionsPage />) },
    ],
  },
  {
    path: '/conversation/:id',
    element: (
      <ProtectedRoute>
        <AppShell showTabBar={false}>
          {withSuspense(<ConversationDetailPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/contacts/:id',
    element: (
      <ProtectedRoute>
        <AppShell showTabBar={false}>
          {withSuspense(<ContactDetailPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/oauth/feishu/callback',
    element: withSuspense(<FeishuOAuthCallbackPage />),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <AppShell showTabBar={false}>
          {withSuspense(<SettingsPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/connectors/feishu',
    element: (
      <ProtectedRoute>
        <AppShell showTabBar={false}>
          {withSuspense(<SettingsConnectorPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
])
