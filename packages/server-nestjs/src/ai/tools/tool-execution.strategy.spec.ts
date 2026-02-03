import { ToolExecutionStrategy } from './tool-execution.strategy';
import { ToolDefinition } from './tool.types';

describe('ToolExecutionStrategy', () => {
  let strategy: ToolExecutionStrategy;

  beforeEach(() => {
    strategy = new ToolExecutionStrategy();
  });

  it('executes tools when permission is allow', async () => {
    const handler = jest.fn().mockResolvedValue({ ok: true });
    const tool: ToolDefinition = {
      name: 'ping',
      handler,
    };

    strategy.registerTool(tool);

    const result = await strategy.execute({ name: 'ping', arguments: { value: 1 } }, { userId: 'u1' });

    expect(result.status).toBe('success');
    expect(result.result).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledWith({ value: 1 }, { userId: 'u1' });
  });

  it('denies tools when permission is deny', async () => {
    const handler = jest.fn();
    const tool: ToolDefinition = {
      name: 'delete',
      handler,
      permission: 'deny',
    };

    strategy.registerTool(tool);

    const result = await strategy.execute({ name: 'delete', arguments: {} }, { userId: 'u1' });

    expect(result.status).toBe('denied');
    expect(handler).not.toHaveBeenCalled();
  });

  it('requires confirmation when permission is confirm and executes after approval', async () => {
    const handler = jest.fn().mockResolvedValue('done');
    const tool: ToolDefinition = {
      name: 'send_email',
      handler,
      permission: 'confirm',
    };

    strategy.registerTool(tool);

    const request = await strategy.execute(
      { name: 'send_email', arguments: { to: 'a@example.com' } },
      { userId: 'u1' },
    );

    expect(request.status).toBe('requires_confirmation');
    expect(request.confirmationId).toBeDefined();
    expect(handler).not.toHaveBeenCalled();

    const approved = await strategy.resolveConfirmation(request.confirmationId!, true);
    expect(approved.status).toBe('success');
    expect(handler).toHaveBeenCalledWith({ to: 'a@example.com' }, { userId: 'u1' });
  });

  it('rejects confirmation when user does not approve', async () => {
    const handler = jest.fn();
    const tool: ToolDefinition = {
      name: 'archive',
      handler,
      permission: 'confirm',
    };

    strategy.registerTool(tool);

    const request = await strategy.execute({ name: 'archive', arguments: {} }, { userId: 'u1' });
    const denied = await strategy.resolveConfirmation(request.confirmationId!, false);

    expect(denied.status).toBe('denied');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns error for invalid JSON arguments', async () => {
    const handler = jest.fn();
    strategy.registerTool({ name: 'parse', handler });

    const result = await strategy.execute({ name: 'parse', arguments: '{bad json' }, {});

    expect(result.status).toBe('error');
    expect(result.error).toBe('Invalid tool arguments JSON.');
    expect(handler).not.toHaveBeenCalled();
  });
});
