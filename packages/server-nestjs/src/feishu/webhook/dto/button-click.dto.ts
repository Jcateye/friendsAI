/**
 * 飞书按钮 Webhook 请求/响应数据传输对象定义
 *
 * 用于接收飞书 Automation 发送的按钮点击回调请求
 */

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Webhook 请求体
 * 飞书 Automation 发送的所有数据都在这个对象里
 */
export class ButtonClickDto {
  /**
   * 请求时间戳（毫秒），用于防重放攻击
   */
  @ApiProperty({
    description: '请求时间戳（毫秒），用于防重放攻击',
    example: '1704067200000',
  })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  /**
   * 飞书签名字符串，用于验证请求来源
   */
  @ApiProperty({
    description: '飞书签名字符串，用于验证请求来源',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  /**
   * Bitable 应用 token
   */
  @ApiProperty({
    description: 'Bitable 应用 token',
    example: 'appxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  appToken: string;

  /**
   * 数据表 ID
   */
  @ApiProperty({
    description: '数据表 ID',
    example: 'tblxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  tableId: string;

  /**
   * 记录 ID
   */
  @ApiProperty({
    description: '记录 ID',
    example: 'recxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  recordId: string;

  /**
   * 按钮 ID
   */
  @ApiProperty({
    description: '按钮 ID',
    example: 'btn approve',
  })
  @IsString()
  @IsOptional()
  buttonId?: string;

  /**
   * 用户 ID
   */
  @ApiProperty({
    description: '用户 ID',
    example: 'ou_xxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  /**
   * 视图 ID（可选）
   */
  @ApiPropertyOptional({
    description: '视图 ID（可选）',
    example: 'vewxxxxxxxxxx',
  })
  @IsOptional()
  viewId?: string;

  /**
   * 自定义字段键值对（Automation 可传递额外数据）
   *
   * 示例：{ "customer_name": "张三", "order_amount": 100 }
   */
  @ApiPropertyOptional({
    description: '自定义字段键值对（Automation 可传递额外数据）',
    example: { customer_name: '张三', order_amount: 100 },
  })
  extraData?: Record<string, any>;
}

/**
 * Webhook 成功响应
 */
export class ButtonClickResponse {
  @ApiProperty({
    description: '处理是否成功',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '响应消息',
    example: '处理成功',
  })
  message: string;

  @ApiPropertyOptional({
    description: '响应数据',
    type: 'object',
    properties: {
      recordId: {
        description: '回传的记录 ID，用于确认',
        type: 'string',
      },
      status: {
        description: '处理状态',
        type: 'string',
        enum: ['received', 'processing', 'completed', 'failed'],
      },
      result: {
        description: '处理结果（可选返回）',
        type: 'object',
        nullable: true,
        additionalProperties: true,
      },
    },
    required: [],
  })
  data?: {
    /**
     * 回传的记录 ID，用于确认
     */
    recordId?: string;

    /**
     * 处理状态
     * - received: 已接收（初始状态）
     * - processing: 处理中
     * - completed: 处理完成
     * - failed: 处理失败
     */
    status?: 'received' | 'processing' | 'completed' | 'failed';

    /**
     * 处理结果（可选返回）
     */
    result?: any;
  };
}

/**
 * Webhook 错误响应
 */
export class ButtonClickErrorResponse {
  @ApiProperty({
    description: '处理是否成功（错误时固定为 false）',
    example: false,
  })
  success: false;

  @ApiProperty({
    description: '错误消息',
    example: '签名验证失败',
  })
  message: string;

  @ApiPropertyOptional({
    description: '错误码',
    example: 'INVALID_SIGNATURE',
  })
  error?: string;
}
