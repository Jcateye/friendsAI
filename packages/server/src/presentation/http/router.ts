import { Router } from 'express';
import { authRouter } from '@/presentation/http/routes/auth';
import { workspaceRouter } from '@/presentation/http/routes/workspaces';
import { contactsRouter } from '@/presentation/http/routes/contacts';
import { journalRouter } from '@/presentation/http/routes/journal';
import { contextRouter } from '@/presentation/http/routes/context';
import { actionRouter } from '@/presentation/http/routes/action';
import { syncRouter } from '@/presentation/http/routes/sync';
import { toolTasksRouter } from '@/presentation/http/routes/toolTasks';

export const router = Router();

router.use('/auth', authRouter);
router.use('/workspaces', workspaceRouter);
router.use('/contacts', contactsRouter);
router.use('/journal-entries', journalRouter);
router.use('/contacts', contextRouter);
router.use('/action-items', actionRouter);
router.use('/tool-tasks', toolTasksRouter);
router.use('/sync', syncRouter);

router.get('/', (_req, res) => {
  res.json({ message: 'FriendsAI API Server' });
});
