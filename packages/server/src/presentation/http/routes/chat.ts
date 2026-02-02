import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';
import { createChatMessage, createChatSession, getChatSession, listChatMessages, listChatSessions, touchChatSession, updateChatMessage } from '@/infrastructure/repositories/chatRepo';

export const chatRouter = Router();

const createSessionSchema = z.object({
  body: z.object({
    firstMessage: z.string().min(1),
    title: z.string().optional()
  })
});

const createMessageSchema = z.object({
  body: z.object({
    role: z.enum(['user', 'assistant', 'tool']).optional(),
    content: z.string().default(''),
    metadata: z.record(z.unknown()).optional()
  })
});

const updateMessageSchema = z.object({
  body: z.object({
    content: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  })
});

const extractReceiverName = (content: string) => {
  const match = content.match(/给([^，。\s]{1,8})/);
  if (!match?.[1]) return undefined;
  const raw = match[1];
  return raw.includes('发') ? raw.split('发')[0] : raw;
};

const buildAssistantReply = (history: Array<{ role: string; content: string }>, content: string) => {
  const shouldTriggerFeishu = /飞书|模板|发送/.test(content);
  if (shouldTriggerFeishu) {
    const receiverName = extractReceiverName(content) || '张三';
    return {
      content: `好的，我来帮你消息给${receiverName}。请选择模板并填写内容：`,
      metadata: { suggestTool: { type: 'feishu', receiverName } }
    };
  }

  const previousUser = [...history].reverse().find((msg) => msg.role === 'user');
  if (previousUser?.content) {
    return {
      content: `你刚才提到“${previousUser.content}”。现在你说“${content}”。我已记下，要不要我帮你整理重点？`,
      metadata: {}
    };
  }

  return {
    content: '好的，我在这里和你对话。你想继续聊什么？',
    metadata: {}
  };
};

chatRouter.get('/sessions', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const items = await listChatSessions(workspaceId, Number.isFinite(limit) ? limit : 20);
  res.json({ items });
}));

chatRouter.post('/sessions', requireAuth, asyncHandler(requireWorkspaceMember), validate(createSessionSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.auth!.userId;
  const session = await createChatSession({
    workspaceId,
    userId,
    title: req.body.title ?? null
  });
  const userMessage = await createChatMessage({
    sessionId: session.id,
    role: 'user',
    content: req.body.firstMessage,
    metadata: {}
  });
  const reply = buildAssistantReply([], req.body.firstMessage);
  const assistantMessage = await createChatMessage({
    sessionId: session.id,
    role: 'assistant',
    content: reply.content,
    metadata: reply.metadata
  });
  await touchChatSession(session.id);
  res.json({ session, messages: [userMessage, assistantMessage] });
}));

chatRouter.get('/sessions/:id/messages', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const session = await getChatSession(workspaceId, req.params.id);
  if (!session) {
    return res.status(404).json({ message: 'Chat session not found' });
  }
  const items = await listChatMessages(session.id, 200);
  res.json({ items });
}));

chatRouter.post('/sessions/:id/messages', requireAuth, asyncHandler(requireWorkspaceMember), validate(createMessageSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const session = await getChatSession(workspaceId, req.params.id);
  if (!session) {
    return res.status(404).json({ message: 'Chat session not found' });
  }
  const role = req.body.role ?? 'user';
  if (role !== 'user') {
    const toolMessage = await createChatMessage({
      sessionId: session.id,
      role,
      content: req.body.content ?? '',
      metadata: req.body.metadata ?? {}
    });
    await touchChatSession(session.id);
    return res.json({ messages: [toolMessage] });
  }

  const history = await listChatMessages(session.id, 50);
  const userMessage = await createChatMessage({
    sessionId: session.id,
    role: 'user',
    content: req.body.content,
    metadata: req.body.metadata ?? {}
  });
  const reply = buildAssistantReply(history, req.body.content);
  const assistantMessage = await createChatMessage({
    sessionId: session.id,
    role: 'assistant',
    content: reply.content,
    metadata: reply.metadata
  });
  await touchChatSession(session.id);
  res.json({ messages: [userMessage, assistantMessage] });
}));

chatRouter.patch('/sessions/:sessionId/messages/:messageId', requireAuth, asyncHandler(requireWorkspaceMember), validate(updateMessageSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const session = await getChatSession(workspaceId, req.params.sessionId);
  if (!session) {
    return res.status(404).json({ message: 'Chat session not found' });
  }
  const updated = await updateChatMessage({
    sessionId: session.id,
    messageId: req.params.messageId,
    content: req.body.content ?? null,
    metadata: req.body.metadata
  });
  if (!updated) {
    return res.status(404).json({ message: 'Chat message not found' });
  }
  res.json(updated);
}));
