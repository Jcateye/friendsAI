import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';

@Injectable()
export class AiService {
  private chatModel: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL');
    const modelName = this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo';
    const embeddingModelName = this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-ada-002';

    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured.');
    }

    // Initialize LangChain Chat Model (supports OpenAI and compatible local models)
    this.chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: modelName,
      configuration: {
        baseURL: baseURL,
      },
      temperature: 0.7,
    });

    // Initialize LangChain Embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: embeddingModelName,
      configuration: {
        baseURL: baseURL,
      },
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await this.embeddings.embedQuery(text);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new InternalServerErrorException('Failed to generate embedding.');
    }
  }

  async callAgent(prompt: string, context?: any): Promise<string> {
    try {
      const messages: BaseMessage[] = [
        new SystemMessage('You are a helpful assistant.'),
      ];

      if (context) {
        messages.push(new SystemMessage(`Context: ${JSON.stringify(context)}`));
      }

      messages.push(new HumanMessage(prompt));

      const response = await this.chatModel.invoke(messages);
      
      // LangChain response content can be string or complex object, for ChatOpenAI it's usually string
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (error) {
      console.error('Error calling AI agent:', error);
      throw new InternalServerErrorException('Failed to call AI agent.');
    }
  }
}
