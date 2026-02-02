import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: '联系人姓名' })
  @IsString()
  name: string;

  @ApiProperty({ description: '联系人邮箱', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: '联系人电话', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '公司', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ description: '职位', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: '个人画像/标签', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '是否标星', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;
}

export class UpdateContactDto {
  @ApiProperty({ description: '联系人姓名', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '联系人邮箱', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: '联系人电话', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '公司', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ description: '职位', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: '个人画像/标签', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '是否标星', required: false })
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;
}

export enum ContactFilter {
  ALL = 'all',
  RECENT = 'recent',
  PENDING = 'pending',
  STARRED = 'starred',
}
