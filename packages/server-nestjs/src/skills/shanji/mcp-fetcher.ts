import fs from 'fs';
import path from 'path';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ShanjiFetchPayload } from './shanji.types';

interface OpencodeMcpServerConfig {
  command?: string[] | string;
  headers?: Record<string, string>;
  environment?: Record<string, string>;
  type?: string;
  url?: string;
}

interface OpencodeMcpConfigFile {
  mcp?: Record<string, OpencodeMcpServerConfig>;
}

interface McpClientLike {
  connect: (transport: {
    close: () => Promise<void>;
  }) => Promise<void>;
  close: () => Promise<void>;
  listTools: () => Promise<{ tools?: Array<{ name: string; inputSchema?: unknown }> }>;
  callTool: (input: { name: string; arguments?: Record<string, unknown> }) => Promise<unknown>;
}

export class ShanjiMcpFetcher {
  private readonly configPath = process.env.SHANJI_MCP_CONFIG_PATH?.trim() || '';
  private readonly serverName = process.env.SHANJI_MCP_SERVER_NAME?.trim() || 'zai-mcp-server';
  private readonly preferredToolName = process.env.SHANJI_MCP_TOOL_NAME?.trim() || '';
  private readonly timeoutMs = this.readPositiveInt(process.env.SHANJI_MCP_TIMEOUT_MS, 45000);

  async fetch(url: string): Promise<ShanjiFetchPayload> {
    const sourceUrl = this.normalizeAndValidateUrl(url);
    const serverConfig = this.loadServerConfig();
    const { client, close } = await this.createMcpClient(serverConfig);

    try {
      const listResponse = await this.withTimeout(client.listTools(), this.timeoutMs, 'listTools');
      const tools = Array.isArray(listResponse?.tools) ? listResponse.tools : [];
      if (tools.length === 0) {
        throw new Error('[shanji_mcp_no_tools] MCP server has no available tools.');
      }

      const targetTool = this.pickTool(tools);
      if (!targetTool) {
        throw new Error('[shanji_mcp_tool_not_found] Unable to resolve a usable MCP tool.');
      }

      const argsCandidates = this.buildArgumentCandidates(
        sourceUrl,
        targetTool.inputSchema as Record<string, unknown> | undefined,
      );

      let lastError: unknown;
      let callResult: unknown;
      for (const args of argsCandidates) {
        try {
          callResult = await this.withTimeout(
            client.callTool({
              name: targetTool.name,
              arguments: args,
            }),
            this.timeoutMs,
            `callTool:${targetTool.name}`,
          );
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (lastError) {
        throw new Error(
          `[shanji_mcp_tool_call_failed] tool=${targetTool.name}; error=${
            lastError instanceof Error ? lastError.message : String(lastError)
          }`,
        );
      }

      const transcriptText = this.extractTranscriptText(callResult).slice(0, 120000);
      if (!transcriptText) {
        throw new Error('[shanji_mcp_empty] MCP response did not include readable transcript content.');
      }

      const audioUrl = this.pickFirstAudioUrl(callResult);
      const transcriptSegments = transcriptText
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter((line) => line.length >= 8)
        .slice(0, 600)
        .map((text, index) => ({
          index: index + 1,
          text: text.slice(0, 600),
        }));

      return {
        sourceUrl,
        transcriptText,
        transcriptSegments,
        audioUrl,
      };
    } finally {
      await close();
    }
  }

  private loadServerConfig(): OpencodeMcpServerConfig {
    const candidatePath = this.configPath || path.resolve(process.cwd(), 'config/mcp/opencode.project.example.json');
    if (!fs.existsSync(candidatePath)) {
      throw new Error(`[shanji_mcp_config_missing] MCP config file not found: ${candidatePath}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
    } catch (error) {
      throw new Error(
        `[shanji_mcp_config_invalid] Failed to parse MCP config JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('[shanji_mcp_config_invalid] MCP config root must be an object.');
    }

    const configFile = parsed as OpencodeMcpConfigFile;
    const mcpRoot = configFile.mcp;
    if (!mcpRoot || typeof mcpRoot !== 'object') {
      throw new Error('[shanji_mcp_config_invalid] MCP config file missing "mcp" object.');
    }

    const serverConfig = mcpRoot[this.serverName];
    if (!serverConfig || typeof serverConfig !== 'object') {
      throw new Error(
        `[shanji_mcp_server_missing] MCP server "${this.serverName}" not found in config.`,
      );
    }

    const resolved = this.resolveServerConfigEnv(serverConfig as OpencodeMcpServerConfig);
    return this.normalizeServerConfig(resolved);
  }

  private async createMcpClient(
    serverConfig: OpencodeMcpServerConfig,
  ): Promise<{ client: McpClientLike; close: () => Promise<void> }> {
    const [{ Client }, { SSEClientTransport }] = await Promise.all([
      import('@modelcontextprotocol/sdk/client/index.js'),
      import('@modelcontextprotocol/sdk/client/sse.js'),
    ]);

    const serverType = (serverConfig.type || 'local').toLowerCase();
    let transport:
      | StreamableHTTPClientTransport
      | StdioClientTransport
      | InstanceType<typeof SSEClientTransport>;

    if (serverType === 'remote' || serverType === 'http' || serverType === 'streamable_http') {
      if (!serverConfig.url) {
        throw new Error('[shanji_mcp_config_invalid] Remote MCP config requires "url".');
      }
      transport = new StreamableHTTPClientTransport(new URL(serverConfig.url), {
        requestInit: {
          headers: this.toStringRecord(serverConfig.headers),
        },
      });
    } else if (serverType === 'sse') {
      if (!serverConfig.url) {
        throw new Error('[shanji_mcp_config_invalid] SSE MCP config requires "url".');
      }
      transport = new SSEClientTransport(new URL(serverConfig.url), {
        requestInit: {
          headers: this.toStringRecord(serverConfig.headers),
        },
      });
    } else {
      const { command, args } = this.resolveCommand(serverConfig.command);
      transport = new StdioClientTransport({
        command,
        args,
        env: {
          ...process.env,
          ...this.toStringRecord(serverConfig.environment),
        } as Record<string, string>,
        stderr: 'pipe',
      });
    }

    const client = new Client({
      name: 'friendsai-shanji-mcp-fetcher',
      version: '1.0.0',
    });
    await this.withTimeout(client.connect(transport), this.timeoutMs, 'connect');

    return {
      client,
      close: async () => {
        try {
          await client.close();
        } catch {
          // ignore close errors
        }
        try {
          await transport.close();
        } catch {
          // ignore close errors
        }
      },
    };
  }

  private resolveCommand(command: OpencodeMcpServerConfig['command']): {
    command: string;
    args: string[];
  } {
    if (Array.isArray(command) && command.length > 0) {
      return {
        command: String(command[0]),
        args: command.slice(1).map((value) => String(value)),
      };
    }

    if (typeof command === 'string') {
      const parts = command
        .trim()
        .split(/\s+/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      if (parts.length > 0) {
        return {
          command: parts[0],
          args: parts.slice(1),
        };
      }
    }

    throw new Error('[shanji_mcp_config_invalid] Local MCP config requires non-empty "command".');
  }

  private normalizeServerConfig(config: OpencodeMcpServerConfig): OpencodeMcpServerConfig {
    const normalized: OpencodeMcpServerConfig = {
      ...config,
    };

    if (normalized.environment && typeof normalized.environment === 'object') {
      const maybeApiKey = normalized.environment.Z_AI_API_KEY?.trim();
      if (!maybeApiKey && process.env.AGENT_LLM_PROVIDER_ZAI_API_KEY) {
        normalized.environment.Z_AI_API_KEY = process.env.AGENT_LLM_PROVIDER_ZAI_API_KEY;
      }
      const maybeMode = normalized.environment.Z_AI_MODE?.trim();
      if (!maybeMode && process.env.Z_AI_MODE) {
        normalized.environment.Z_AI_MODE = process.env.Z_AI_MODE;
      }
    }

    if (normalized.headers && typeof normalized.headers === 'object') {
      const auth = normalized.headers.Authorization?.trim();
      const authMissingToken =
        !auth ||
        /^Bearer$/i.test(auth) ||
        /^Bearer\s+(\$\{[A-Z0-9_]+\}|)$/i.test(auth);
      if (authMissingToken && process.env.AGENT_LLM_PROVIDER_ZAI_API_KEY) {
        normalized.headers.Authorization = `Bearer ${process.env.AGENT_LLM_PROVIDER_ZAI_API_KEY}`;
      }
    }

    return normalized;
  }

  private resolveServerConfigEnv(config: OpencodeMcpServerConfig): OpencodeMcpServerConfig {
    const resolveValue = (value: string): string =>
      value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, key: string) => process.env[key] ?? '');

    const resolved: OpencodeMcpServerConfig = {
      ...config,
    };

    if (typeof resolved.command === 'string') {
      resolved.command = resolveValue(resolved.command);
    } else if (Array.isArray(resolved.command)) {
      resolved.command = resolved.command.map((item) => resolveValue(String(item)));
    }

    if (typeof resolved.url === 'string') {
      resolved.url = resolveValue(resolved.url);
    }

    if (resolved.environment && typeof resolved.environment === 'object') {
      resolved.environment = Object.fromEntries(
        Object.entries(resolved.environment).map(([key, value]) => [key, resolveValue(String(value))]),
      );
    }

    if (resolved.headers && typeof resolved.headers === 'object') {
      resolved.headers = Object.fromEntries(
        Object.entries(resolved.headers).map(([key, value]) => [key, resolveValue(String(value))]),
      );
    }

    return resolved;
  }

  private toStringRecord(
    value: Record<string, unknown> | undefined,
  ): Record<string, string> | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const entries = Object.entries(value)
      .map(([key, item]) => [key, String(item)])
      .filter(([, item]) => item.length > 0);
    return Object.fromEntries(entries);
  }

  private pickTool(
    tools: Array<{ name: string; inputSchema?: unknown }>,
  ): { name: string; inputSchema?: unknown } | null {
    if (this.preferredToolName) {
      const exact = tools.find((tool) => tool.name === this.preferredToolName);
      if (exact) {
        return exact;
      }
    }

    const candidatesByName = [
      /^webReader$/i,
      /^web_reader$/i,
      /read.*url/i,
      /fetch.*url/i,
      /crawl/i,
      /scrape/i,
      /shanji/i,
      /transcribe/i,
    ];

    for (const matcher of candidatesByName) {
      const matched = tools.find((tool) => matcher.test(tool.name));
      if (matched) {
        return matched;
      }
    }

    const withUrlArg = tools.find((tool) => {
      const schema = this.toRecord(tool.inputSchema);
      const props = this.toRecord(schema?.properties);
      return Boolean(props?.url);
    });
    if (withUrlArg) {
      return withUrlArg;
    }

    return tools[0] ?? null;
  }

  private buildArgumentCandidates(
    url: string,
    inputSchema: Record<string, unknown> | undefined,
  ): Array<Record<string, unknown>> {
    const props = this.toRecord(this.toRecord(inputSchema)?.properties);
    const has = (name: string) => Boolean(props && name in props);
    const candidates: Array<Record<string, unknown>> = [];

    const primary: Record<string, unknown> = {};
    if (has('url')) {
      primary.url = url;
    } else if (has('input')) {
      primary.input = url;
    } else if (has('query')) {
      primary.query = url;
    } else {
      primary.url = url;
    }

    if (has('return_format')) {
      primary.return_format = 'markdown';
    }
    if (has('no_cache')) {
      primary.no_cache = true;
    }
    if (has('with_links_summary')) {
      primary.with_links_summary = true;
    }
    candidates.push(primary);

    if (!('url' in primary)) {
      candidates.push({ ...primary, url });
    }
    if (!('input' in primary)) {
      candidates.push({ ...primary, input: url });
    }
    if (!('query' in primary)) {
      candidates.push({ ...primary, query: url });
    }

    candidates.push({ url });
    return this.dedupeCandidates(candidates);
  }

  private dedupeCandidates(
    candidates: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    const seen = new Set<string>();
    const deduped: Array<Record<string, unknown>> = [];
    for (const item of candidates) {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(item);
    }
    return deduped;
  }

  private extractTranscriptText(result: unknown): string {
    const chunks = this.collectTextChunks(result);
    const normalized = chunks
      .map((item) => item.replace(/\r\n/g, '\n').replace(/\s+\n/g, '\n').trim())
      .filter((item) => item.length > 0)
      .join('\n')
      .trim();
    return normalized.slice(0, 120000);
  }

  private collectTextChunks(value: unknown, depth = 0): string[] {
    if (depth > 8 || value === null || value === undefined) {
      return [];
    }

    if (typeof value === 'string') {
      const decoded = this.tryDecodeJsonString(value);
      if (typeof decoded === 'string') {
        return this.extractTextFromString(decoded);
      }
      return this.collectTextChunks(decoded, depth + 1);
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectTextChunks(item, depth + 1));
    }

    if (typeof value !== 'object') {
      return [];
    }

    const record = value as Record<string, unknown>;
    const preferredTextFields = [
      'transcriptText',
      'transcript',
      'markdown',
      'content',
      'text',
      'body',
      'article',
      'data',
      'summary',
    ];
    const chunks: string[] = [];

    for (const field of preferredTextFields) {
      if (!(field in record)) {
        continue;
      }
      chunks.push(...this.collectTextChunks(record[field], depth + 1));
    }

    for (const [key, item] of Object.entries(record)) {
      if (preferredTextFields.includes(key)) {
        continue;
      }
      chunks.push(...this.collectTextChunks(item, depth + 1));
    }

    return chunks;
  }

  private extractTextFromString(input: string): string[] {
    const text = input.trim();
    if (!text) {
      return [];
    }

    if (text.length > 50000) {
      return [text];
    }

    const lines = text
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => line.length >= 8);

    if (lines.length > 0) {
      return lines;
    }
    return [text];
  }

  private tryDecodeJsonString(input: string): unknown {
    let current: unknown = input.trim();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (typeof current !== 'string') {
        return current;
      }
      const raw = current.trim();
      if (!raw) {
        return '';
      }

      const mayBeJson =
        raw.startsWith('{') ||
        raw.startsWith('[') ||
        (raw.startsWith('"') && raw.endsWith('"'));
      if (!mayBeJson) {
        return raw;
      }

      try {
        current = JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return current;
  }

  private pickFirstAudioUrl(value: unknown): string | undefined {
    const urls = this.collectUrls(value, 0);
    const match = urls.find((url) =>
      /(\.mp3|\.m4a|\.wav|\.aac|\.flac|\/audio|audioUrl|queryplayinfo)/i.test(url),
    );
    return match;
  }

  private collectUrls(value: unknown, depth: number): string[] {
    if (depth > 8 || value === null || value === undefined) {
      return [];
    }

    if (typeof value === 'string') {
      const text = value.trim();
      const hits = text.match(/https?:\/\/[^\s"']+/g);
      return hits ? hits : [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectUrls(item, depth + 1));
    }
    if (typeof value !== 'object') {
      return [];
    }

    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      this.collectUrls(item, depth + 1),
    );
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private normalizeAndValidateUrl(url: string): string {
    const normalized = typeof url === 'string' ? url.trim() : '';
    if (!normalized) {
      throw new Error('[shanji_url_required] Shanji URL is required.');
    }
    if (!/^https?:\/\/shanji\.dingtalk\.com\/app\/transcribes\/[A-Za-z0-9_%\-]+/i.test(normalized)) {
      throw new Error('[shanji_url_invalid] Unsupported Shanji URL.');
    }
    return normalized;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`[shanji_mcp_timeout] ${label} timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }
}
