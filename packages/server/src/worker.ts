import { env } from '@/config/env';
import { claimToolTasksToRun, markToolTaskDone, markToolTaskFailed, recordToolExecution } from '@/infrastructure/repositories/contextRepo';
import { getToolProvider } from '@/infrastructure/tools';

const provider = getToolProvider();

const runOnce = async () => {
  const tasks = await claimToolTasksToRun(20);
  for (const task of tasks) {
    try {
      const result = await provider.execute(task.type, task.payload_json ?? {});
      await recordToolExecution({
        toolTaskId: task.id,
        provider: env.toolProvider,
        requestJson: task.payload_json ?? {},
        responseJson: result.response,
        status: result.status
      });
      if (result.status === 'success') {
        await markToolTaskDone(task.id);
      } else {
        await markToolTaskFailed(task.id);
      }
    } catch (err) {
      await recordToolExecution({
        toolTaskId: task.id,
        provider: env.toolProvider,
        requestJson: task.payload_json ?? {},
        responseJson: { error: err instanceof Error ? err.message : String(err) },
        status: 'error'
      });
      await markToolTaskFailed(task.id);
      // eslint-disable-next-line no-console
      console.error('Tool task failed', err);
    }
  }
};

const loop = async () => {
  await runOnce();
  setTimeout(loop, env.toolWorkerIntervalMs);
};

loop();
