import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { getToolProvider } from '@/infrastructure/tools';

export const feishuRouter = Router();

const templates = [
  {
    id: 'follow_up',
    name: '客户跟进提醒',
    description: '适用于日常跟进、进度确认',
    defaultContent: 'Q2合作方案报价优化版本已准备好，方便时可以约个电话沟通细节。'
  },
  {
    id: 'proposal',
    name: '报价方案发送',
    description: '正式发送报价文档',
    defaultContent: '报价方案已整理完成，方便的话我这边安排发送给你。'
  }
];

const sendSchema = z.object({
  body: z.object({
    templateId: z.string(),
    receiverName: z.string(),
    content: z.string()
  })
});

feishuRouter.get('/templates', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (_req, res) => {
  res.json({ items: templates });
}));

feishuRouter.post('/messages', requireAuth, asyncHandler(requireWorkspaceMember), validate(sendSchema), asyncHandler(async (req, res) => {
  const provider = getToolProvider();
  const toolCallId = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result = await provider.execute('feishu_template_message', {
    templateId: req.body.templateId,
    receiverName: req.body.receiverName,
    content: req.body.content
  });
  res.json({
    id: toolCallId,
    status: result.status,
    response: result.response
  });
}));
