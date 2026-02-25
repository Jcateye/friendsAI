import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { FeishuApiService } from '../feishu/api/feishu-api.service';
import { FeishuOAuthService } from './feishu-oauth.service';
import {
  BitableSearchRequestDto,
  BitableSearchResponseDto,
  BitableRecordResponseDto,
  BitableUpdateRecordRequestDto,
} from './dto/feishu-bitable.dto';

type JsonObject = Record<string, unknown>;

@Injectable()
export class FeishuBitableService {
  constructor(
    private readonly feishuApiService: FeishuApiService,
    private readonly feishuOAuthService: FeishuOAuthService,
  ) {}

  async searchRecords(
    userId: string,
    appToken: string,
    tableId: string,
    body: BitableSearchRequestDto = {},
  ): Promise<BitableSearchResponseDto> {
    this.validatePathParam(appToken, 'appToken');
    this.validatePathParam(tableId, 'tableId');

    if (body.pageSize !== undefined && (!Number.isInteger(body.pageSize) || body.pageSize < 1 || body.pageSize > 500)) {
      throw new BadRequestException('pageSize must be an integer between 1 and 500');
    }

    if (body.filter !== undefined && !this.isPlainObject(body.filter)) {
      throw new BadRequestException('filter must be a plain object');
    }

    const accessToken = await this.getRequiredAccessToken(userId);
    const result = await this.feishuApiService.searchRecords(appToken, tableId, {
      pageSize: body.pageSize,
      pageToken: body.pageToken,
      filter: body.filter,
      accessToken,
    });

    return {
      success: true,
      data: {
        records: result.records,
        hasMore: result.hasMore,
        pageToken: result.pageToken,
      },
    };
  }

  async getRecord(
    userId: string,
    appToken: string,
    tableId: string,
    recordId: string,
  ): Promise<BitableRecordResponseDto> {
    this.validatePathParam(appToken, 'appToken');
    this.validatePathParam(tableId, 'tableId');
    this.validatePathParam(recordId, 'recordId');

    const accessToken = await this.getRequiredAccessToken(userId);
    const record = await this.feishuApiService.getRecord(appToken, tableId, recordId, accessToken);
    return {
      success: true,
      data: record,
    };
  }

  async updateRecord(
    userId: string,
    appToken: string,
    tableId: string,
    recordId: string,
    body: BitableUpdateRecordRequestDto,
  ): Promise<BitableRecordResponseDto> {
    this.validatePathParam(appToken, 'appToken');
    this.validatePathParam(tableId, 'tableId');
    this.validatePathParam(recordId, 'recordId');

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('request body is required');
    }

    if (!this.isNonEmptyPlainObject(body.fields)) {
      throw new BadRequestException('fields must be a non-empty object');
    }

    const accessToken = await this.getRequiredAccessToken(userId);
    const record = await this.feishuApiService.updateRecord(
      appToken,
      tableId,
      recordId,
      body.fields as JsonObject,
      accessToken,
    );

    return {
      success: true,
      data: record,
    };
  }

  private async getRequiredAccessToken(userId: string): Promise<string> {
    if (!userId || !userId.trim()) {
      throw new UnauthorizedException('User identity is required');
    }

    const tokens = await this.feishuOAuthService.getUserToken(userId, true);
    if (!tokens?.accessToken) {
      throw new UnauthorizedException('Feishu authorization is required');
    }

    return tokens.accessToken;
  }

  private validatePathParam(value: string, fieldName: string): void {
    if (!value || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new BadRequestException(`${fieldName} format is invalid`);
    }
  }

  private isPlainObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isNonEmptyPlainObject(value: unknown): value is JsonObject {
    if (!this.isPlainObject(value)) {
      return false;
    }

    return Object.keys(value).length > 0;
  }
}
