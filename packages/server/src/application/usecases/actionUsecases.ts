import { createActionItem, updateActionItem, createToolTask } from '@/infrastructure/repositories/contextRepo';

export const createActionItemUseCase = async (data: {
  contactId: string;
  dueAt?: Date | null;
  suggestionReason?: string;
  sourceEntryId: string;
  toolTask?: { type: string; payload: Record<string, unknown>; executeAt?: Date | null };
}) => {
  const actionItem = await createActionItem({
    contactId: data.contactId,
    dueAt: data.dueAt,
    suggestionReason: data.suggestionReason,
    sourceEntryId: data.sourceEntryId
  });

  if (data.toolTask) {
    await createToolTask({
      actionItemId: actionItem.id,
      type: data.toolTask.type,
      payload: data.toolTask.payload,
      executeAt: data.toolTask.executeAt,
      status: 'pending'
    });
  }
  return actionItem;
};

export const updateActionItemUseCase = async (id: string, data: { status?: string; dueAt?: Date | null }) => {
  return updateActionItem(id, data);
};

export const executeActionToolUseCase = async (actionItemId: string, toolTask: { type: string; payload: Record<string, unknown>; executeAt?: Date | null }) => {
  return createToolTask({
    actionItemId,
    type: toolTask.type,
    payload: toolTask.payload,
    executeAt: toolTask.executeAt,
    status: 'confirmed'
  });
};
