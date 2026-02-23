import { Injectable } from '@nestjs/common';
import type { AgentRunStatus, AgentSseEvent } from './client-types';

interface TimelineItem {
  seq: number;
  event: string;
  at: string;
  payload: Record<string, unknown>;
}

export interface AgentRunTimeline {
  runId: string;
  agentId?: string;
  status: AgentRunStatus;
  startedAt: string;
  endedAt?: string;
  events: TimelineItem[];
}

@Injectable()
export class AgentRunTraceStore {
  private readonly timelines = new Map<string, AgentRunTimeline>();
  private readonly maxRuns = 300;

  append(event: AgentSseEvent): void {
    const runId = this.resolveRunId(event);
    if (!runId) return;

    const timeline = this.timelines.get(runId) ?? this.createTimeline(runId, event);
    const item: TimelineItem = {
      seq: timeline.events.length + 1,
      event: event.event,
      at: new Date().toISOString(),
      payload: this.asRecord(event.data),
    };
    timeline.events.push(item);

    if (event.event === 'agent.start') {
      timeline.status = 'running';
      timeline.agentId = event.data.agentId;
      timeline.startedAt = event.data.createdAt;
    }

    if (event.event === 'agent.end') {
      timeline.status = event.data.status;
      timeline.endedAt = event.data.finishedAt;
    }

    this.timelines.set(runId, timeline);
    this.evictOldRuns();
  }

  get(runId: string): AgentRunTimeline | undefined {
    const timeline = this.timelines.get(runId);
    if (!timeline) return undefined;
    return {
      ...timeline,
      events: [...timeline.events],
    };
  }

  private createTimeline(runId: string, event: AgentSseEvent): AgentRunTimeline {
    const now = new Date().toISOString();
    return {
      runId,
      agentId: event.event === 'agent.start' ? event.data.agentId : undefined,
      status: event.event === 'agent.end' ? event.data.status : 'running',
      startedAt: event.event === 'agent.start' ? event.data.createdAt : now,
      endedAt: event.event === 'agent.end' ? event.data.finishedAt : undefined,
      events: [],
    };
  }

  private resolveRunId(event: AgentSseEvent): string | undefined {
    if (event.event === 'agent.start' || event.event === 'agent.end') {
      return event.data.runId;
    }

    const payload = this.asRecord(event.data);
    const runId = payload.runId;
    return typeof runId === 'string' ? runId : undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { value };
    }
    return value as Record<string, unknown>;
  }

  private evictOldRuns(): void {
    if (this.timelines.size <= this.maxRuns) return;
    const overflow = this.timelines.size - this.maxRuns;
    const keys = this.timelines.keys();
    for (let i = 0; i < overflow; i += 1) {
      const key = keys.next().value;
      if (typeof key === 'string') {
        this.timelines.delete(key);
      }
    }
  }
}
