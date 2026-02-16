export class AgentRuntimeError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly retryable?: boolean;

  constructor(params: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = 'AgentRuntimeError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;
    this.retryable = params.retryable;
  }
}
