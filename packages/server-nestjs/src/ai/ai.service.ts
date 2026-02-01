import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured.');
    }
    this.openai = new OpenAI({ apiKey });
    this.model = 'gpt-3.5-turbo'; // Default model for chat/agent calls
    this.embeddingModel = 'text-embedding-ada-002'; // Default model for embeddings
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new InternalServerErrorException('Failed to generate embedding.');
    }
  }

  async callAgent(prompt: string, context?: any): Promise<string> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ];

      if (context) {
        messages.splice(1, 0, { role: 'system', content: `Context: ${JSON.stringify(context)}` });
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      console.error('Error calling AI agent:', error);
      throw new InternalServerErrorException('Failed to call AI agent.');
    }
  }
}
