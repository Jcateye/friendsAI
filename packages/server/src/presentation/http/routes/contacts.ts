import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { validate } from '@/app/middleware/validate';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  addContactIdentity,
  deleteContactIdentityForContact,
  addTag,
  addContactTag,
  deleteContactTag
} from '@/infrastructure/repositories/contactRepo';
import { contextRouter } from '@/presentation/http/routes/context';

export const contactsRouter = Router();

const createSchema = z.object({
  body: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    avatarUrl: z.string().url().optional(),
    notes: z.string().optional(),
    status: z.string().optional()
  })
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    avatarUrl: z.string().url().optional(),
    notes: z.string().optional(),
    status: z.string().optional()
  })
});

const identitySchema = z.object({
  body: z.object({
    type: z.string().min(1),
    value: z.string().min(1)
  })
});

const tagSchema = z.object({
  body: z.object({
    name: z.string().min(1)
  })
});

contactsRouter.get('/', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const items = await listContacts(workspaceId);
  res.json({ items });
}));

contactsRouter.post('/', requireAuth, asyncHandler(requireWorkspaceMember), validate(createSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await createContact(workspaceId, req.body);
  res.json(contact);
}));

contactsRouter.get('/:id', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  res.json(contact);
}));

contactsRouter.patch('/:id', requireAuth, asyncHandler(requireWorkspaceMember), validate(updateSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await updateContact(workspaceId, req.params.id, req.body);
  res.json(contact);
}));

contactsRouter.post('/:id/identities', requireAuth, asyncHandler(requireWorkspaceMember), validate(identitySchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  const identity = await addContactIdentity(req.params.id, req.body.type, req.body.value);
  res.json(identity);
}));

contactsRouter.delete('/:id/identities/:identityId', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  const identity = await deleteContactIdentityForContact(req.params.id, req.params.identityId);
  res.json(identity);
}));

contactsRouter.post('/:id/tags', requireAuth, asyncHandler(requireWorkspaceMember), validate(tagSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  const tag = await addTag(workspaceId, req.body.name);
  const contactTag = await addContactTag(req.params.id, tag.id);
  res.json({ tag, contactTag });
}));

contactsRouter.delete('/:id/tags/:tagId', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  const contactTag = await deleteContactTag(req.params.id, req.params.tagId);
  res.json(contactTag);
}));

contactsRouter.use('/', contextRouter);
