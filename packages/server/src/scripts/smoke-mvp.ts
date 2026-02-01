import { env } from '@/config/env';

const API_BASE = process.env.SMOKE_API_BASE ?? `http://localhost:${env.port}/v1`;

const rand = () => Math.random().toString(16).slice(2);

async function http<T>(path: string, options: { method?: string; token?: string; workspaceId?: string; body?: any } = {}): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.workspaceId ? { 'X-Workspace-Id': options.workspaceId } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await resp.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${path}: ${JSON.stringify(json)}`);
  }
  return json as T;
}

async function main() {
  // 1) Register (auto-login)
  const email = `smoke+${Date.now()}_${rand()}@example.com`;
  const password = `Passw0rd_${rand()}`;
  const reg = await http<{ accessToken: string; refreshToken: string; user: any; workspace: any }>('/auth/register', {
    method: 'POST',
    body: { name: 'Smoke', email, password }
  });

  const token = reg.accessToken;
  const workspaceId = reg.workspace.id;

  // 2) Create contact
  const contact = await http<any>('/contacts', {
    method: 'POST',
    token,
    workspaceId,
    body: { name: 'Alice', notes: 'Met at demo day' }
  });

  // 3) Create journal entry (use mock-friendly prefixes)
  const journal = await http<any>('/journal-entries', {
    method: 'POST',
    token,
    workspaceId,
    body: {
      rawText: [
        'event: demo day coffee chat',
        'fact: company: Example Inc',
        'action: follow up next week'
      ].join('\n')
    }
  });

  // 4) Extract + confirm first item
  const extracted = await http<{ items: any[] }>(`/journal-entries/${journal.id}/extract`, {
    method: 'POST',
    token,
    workspaceId,
    body: { mode: 'fast' }
  });
  if (!extracted.items?.length) {
    throw new Error('No extracted items; set AI_PROVIDER=mock to smoke-test extraction deterministically.');
  }

  const list = await http<{ items: any[] }>(`/journal-entries/${journal.id}/extract`, {
    method: 'GET',
    token,
    workspaceId
  });

  const first = list.items[0];
  await http<any>(`/journal-entries/${journal.id}/confirm`, {
    method: 'POST',
    token,
    workspaceId,
    body: { itemId: first.id, action: 'confirm', contactId: contact.id }
  });

  // 5) Generate brief
  await http<any>(`/contacts/${contact.id}/brief`, {
    method: 'POST',
    token,
    workspaceId,
    body: { forceRefresh: true }
  });

  // 6) Create a tool task (pending) and confirm it.
  const action = await http<any>('/action-items', {
    method: 'POST',
    token,
    workspaceId,
    body: {
      contactId: contact.id,
      sourceEntryId: journal.id,
      suggestionReason: 'Send a follow-up message',
      toolTask: { type: 'webhook', payloadJson: { to: 'alice', text: 'Hello' } }
    }
  });

  const pending = await http<{ items: any[] }>('/tool-tasks?status=pending', {
    method: 'GET',
    token,
    workspaceId
  });

  const task = pending.items.find((t) => t.action_item_id === action.id) ?? pending.items[0];
  if (task) {
    await http<any>(`/tool-tasks/${task.id}/confirm`, {
      method: 'POST',
      token,
      workspaceId,
      body: {}
    });
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    ok: true,
    apiBase: API_BASE,
    ...(process.env.SMOKE_INCLUDE_TOKEN === '1' ? { accessToken: token } : {}),
    workspaceId,
    userId: reg.user.id,
    contactId: contact.id,
    journalEntryId: journal.id,
    confirmedToolTaskId: task?.id ?? null
  }));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
