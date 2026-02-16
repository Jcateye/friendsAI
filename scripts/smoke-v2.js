#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000/v1';
const email = process.env.SMOKE_EMAIL || `smoke-${Date.now()}@example.com`;
const password = process.env.SMOKE_PASSWORD || 'smoke-pass-123';

const logStep = (message) => {
  console.log(`\n[smoke] ${message}`);
};

const fetchJson = async (path, options = {}, accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Unexpected response for ${path}: ${text}`);
  }

  if (!response.ok) {
    const message = json?.message || json?.error || text;
    throw new Error(`Request failed ${response.status} ${path}: ${message}`);
  }

  return json;
};

const runChat = async (conversationId, accessToken) => {
  logStep('聊天（SSE）');

  const response = await fetch(`${baseUrl}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      conversationId,
      prompt: 'Please summarize the conversation.',
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Chat request failed ${response.status}: ${message}`);
  }

  const bodyText = await response.text();
  if (bodyText.includes('event: error')) {
    throw new Error(`Chat stream error:\n${bodyText}`);
  }
  if (!bodyText.includes('event: agent.end')) {
    throw new Error('Chat stream did not emit agent.end');
  }
};

const run = async () => {
  logStep(`Using baseUrl=${baseUrl}`);

  logStep('Register user');
  const register = await fetchJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name: 'Smoke User',
    }),
  });

  const accessToken = register.accessToken;
  if (!accessToken) {
    throw new Error('Missing accessToken from register response');
  }

  logStep('Create conversation');
  const conversation = await fetchJson(
    '/conversations',
    {
      method: 'POST',
      body: JSON.stringify({
        title: 'Smoke Conversation',
        content: 'Met Alex today to discuss next week milestones.',
      }),
    },
    accessToken,
  );

  if (!conversation?.id) {
    throw new Error('Missing conversation id');
  }

  await runChat(conversation.id, accessToken);

  logStep('Archive conversation');
  const archive = await fetchJson(
    `/conversations/${conversation.id}/archive`,
    { method: 'POST' },
    accessToken,
  );

  if (!archive?.id) {
    throw new Error('Missing archive id');
  }

  logStep('Apply archive');
  await fetchJson(
    `/conversation-archives/${archive.id}/apply`,
    { method: 'POST' },
    accessToken,
  );

  logStep('Fetch contacts');
  const contacts = await fetchJson('/contacts?page=1&limit=1', { method: 'GET' }, accessToken);
  const contactId = contacts?.items?.[0]?.id;
  if (!contactId) {
    throw new Error('No contact found after archive apply');
  }

  logStep('Generate contact brief');
  await fetchJson(`/contacts/${contactId}/brief/refresh`, { method: 'POST' }, accessToken);

  logStep('Smoke complete');
};

run().catch((error) => {
  console.error(`\n[smoke] Failed: ${error.message}`);
  process.exitCode = 1;
});
