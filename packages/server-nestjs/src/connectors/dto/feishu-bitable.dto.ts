import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmptyObject, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

type JsonObject = Record<string, unknown>;

export class BitableSearchRequestDto {
  @ApiPropertyOptional({
    description: '每页条数，默认 100',
    minimum: 1,
    maximum: 500,
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @ApiPropertyOptional({
    description: '分页游标',
    example: 'abc123',
  })
  @IsOptional()
  @IsString()
  pageToken?: string;

  @ApiPropertyOptional({
    description: '飞书多维表筛选条件对象',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  filter?: JsonObject;
}

export class BitableUpdateRecordRequestDto {
  @ApiProperty({
    description: '需要更新的字段对象',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsNotEmptyObject({ nullable: false })
  fields: JsonObject;
}

export class BitableSearchDataDto {
  @ApiProperty({
    description: '记录列表',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
    },
  })
  records: JsonObject[];

  @ApiProperty({ description: '是否有下一页' })
  hasMore: boolean;

  @ApiPropertyOptional({ description: '下一页游标' })
  pageToken?: string;
}

export class BitableSearchResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: BitableSearchDataDto })
  data: BitableSearchDataDto;
}

export class BitableRecordResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    description: '单条记录',
    type: 'object',
    additionalProperties: true,
  })
  data: JsonObject;
}
