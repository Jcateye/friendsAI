import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { ChatPage } from '../pages/ChatPage'
import { ConversationDetailPage } from '../pages/ConversationDetailPage'
import { ContactsPage } from '../pages/ContactsPage'
import { ContactDetailPage } from '../pages/ContactDetailPage'
import { ActionsPage } from '../pages/ActionsPage'
import { SettingsPage } from '../pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'actions', element: <ActionsPage /> },
    ],
  },
  {
    path: '/conversation/:id',
    element: (
      <AppShell showTabBar={false}>
        <ConversationDetailPage />
      </AppShell>
    ),
  },
  {
    path: '/contacts/:id',
    element: (
      <AppShell showTabBar={false}>
        <ContactDetailPage />
      </AppShell>
    ),
  },
  {
    path: '/settings',
    element: (
      <AppShell showStatusBar showTabBar={false}>
        <SettingsPage />
      </AppShell>
    ),
  },
])
