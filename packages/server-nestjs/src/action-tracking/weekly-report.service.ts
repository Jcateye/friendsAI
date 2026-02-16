import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ActionOutcomeLog } from '../v3-entities/action-outcome-log.entity';
import { WeeklyReportCache } from '../v3-entities/weekly-report-cache.entity';
import { WeeklyMetrics } from './action-tracking.types';

/**
 * 缓存有效期（1 小时，单位：毫秒）
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * 默认统计天数
 */
const DEFAULT_DAYS = 7;

/**
 * 每周统计服务
 *
 * 提供用户行为指标统计功能，支持缓存机制以提高查询性能。
 * 主要指标包括：
 * - actionCompletionRate: 采纳率 = 总采纳数 / 总建议展示数
 * - replyRate: 回复率 = 总回复数 / 总发送数
 * - followupRate: 推进率 = 完成跟进数 / 总采纳数
 */
@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    @InjectRepository(ActionOutcomeLog, 'v3')
    private readonly logRepo: Repository<ActionOutcomeLog>,
    @InjectRepository(WeeklyReportCache, 'v3')
    private readonly cacheRepo: Repository<WeeklyReportCache>,
  ) {}

  /**
   * 获取用户每周指标
   *
   * 首先检查缓存，如果缓存存在且未过期则返回缓存数据。
   * 否则重新计算指标并更新缓存。
   *
   * @param userId 用户 ID
   * @param days 统计天数，默认 7 天
   * @returns 每周指标数据
   */
  async getMetrics(userId: string, days: number = DEFAULT_DAYS): Promise<WeeklyMetrics> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // 标准化为周一为一周的开始
    const weekStartDate = this.getWeekStartDate(startDate);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    // 检查缓存
    const cached = await this.getValidCache(userId, weekStartDate, weekEndDate);
    if (cached) {
      this.logger.debug(`Using cached report for user ${userId}`);
      return this.buildMetricsFromCache(cached);
    }

    // 计算新指标
    this.logger.debug(`Calculating new report for user ${userId}`);
    const metrics = await this.calculateMetrics(userId, startDate, endDate);

    // 更新缓存
    await this.updateCache(userId, weekStartDate, weekEndDate, metrics);

    return metrics;
  }

  /**
   * 刷新用户缓存
   *
   * 强制重新计算指标并更新缓存，忽略现有缓存的有效性。
   *
   * @param userId 用户 ID
   */
  async refreshCache(userId: string): Promise<void> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - DEFAULT_DAYS + 1);
    startDate.setHours(0, 0, 0, 0);

    const weekStartDate = this.getWeekStartDate(startDate);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    // 计算新指标
    const metrics = await this.calculateMetrics(userId, startDate, endDate);

    // 更新缓存
    await this.updateCache(userId, weekStartDate, weekEndDate, metrics);

    this.logger.log(`Cache refreshed for user ${userId}`);
  }

  /**
   * 计算用户指标
   *
   * 基于指定时间范围内的行动日志计算各项指标。
   *
   * @param userId 用户 ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 计算出的指标数据
   */
  private async calculateMetrics(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WeeklyMetrics> {
    // 查询指定时间范围内的所有行动日志
    const logs = await this.logRepo.find({
      where: {
        userId,
        actionTimestamp: Between(startDate, endDate),
      },
      order: {
        actionTimestamp: 'ASC',
      },
    });

    // 统计各类事件数量
    const totalSuggestions = logs.filter(
      (log) => log.actionType === 'suggestion_shown',
    ).length;

    const totalAccepted = logs.filter(
      (log) => log.actionType === 'suggestion_accepted',
    ).length;

    const totalSent = logs.filter(
      (log) => log.actionType === 'message_sent',
    ).length;

    const totalReplied = logs.filter(
      (log) => log.actionType === 'message_replied',
    ).length;

    const followupCompleted = logs.filter(
      (log) => log.actionType === 'followup_completed',
    ).length;

    // 计算比率（避免除零错误）
    const actionCompletionRate =
      totalSuggestions > 0
        ? (totalAccepted / totalSuggestions) * 100
        : 0;

    const replyRate =
      totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

    const followupRate =
      totalAccepted > 0 ? (followupCompleted / totalAccepted) * 100 : 0;

    return {
      actionCompletionRate,
      replyRate,
      followupRate,
      totalSuggestions,
      totalAccepted,
      totalSent,
      totalReplied,
    };
  }

  /**
   * 获取有效的缓存记录
   *
   * @param userId 用户 ID
   * @param weekStartDate 周开始日期
   * @param weekEndDate 周结束日期
   * @returns 有效的缓存记录，如果不存在或已过期则返回 null
   */
  private async getValidCache(
    userId: string,
    weekStartDate: Date,
    weekEndDate: Date,
  ): Promise<WeeklyReportCache | null> {
    const cache = await this.cacheRepo.findOne({
      where: {
        userId,
        weekStartDate,
        weekEndDate,
      },
    });

    if (!cache) {
      return null;
    }

    // 检查缓存是否过期
    const now = new Date();
    const cacheAge = now.getTime() - cache.updatedAt.getTime();
    if (cacheAge > CACHE_TTL_MS) {
      this.logger.debug(`Cache expired for user ${userId}`);
      return null;
    }

    return cache;
  }

  /**
   * 更新或创建缓存记录
   *
   * @param userId 用户 ID
   * @param weekStartDate 周开始日期
   * @param weekEndDate 周结束日期
   * @param metrics 指标数据
   */
  private async updateCache(
    userId: string,
    weekStartDate: Date,
    weekEndDate: Date,
    metrics: WeeklyMetrics,
  ): Promise<void> {
    const existing = await this.cacheRepo.findOne({
      where: {
        userId,
        weekStartDate,
        weekEndDate,
      },
    });

    const now = new Date();

    if (existing) {
      // 更新现有缓存
      await this.cacheRepo.save({
        ...existing,
        totalSuggestions: metrics.totalSuggestions,
        acceptedSuggestions: metrics.totalAccepted,
        messagesSent: metrics.totalSent,
        messagesReplied: metrics.totalReplied,
        followupsCompleted:
          metrics.totalAccepted > 0
            ? Math.round((metrics.followupRate / 100) * metrics.totalAccepted)
            : 0,
        acceptanceRate: metrics.actionCompletionRate,
        replyRate: metrics.replyRate,
        conversionRate: metrics.followupRate,
        updatedAt: now,
      });
    } else {
      // 创建新缓存
      const cache = this.cacheRepo.create({
        userId,
        weekStartDate,
        weekEndDate,
        totalSuggestions: metrics.totalSuggestions,
        acceptedSuggestions: metrics.totalAccepted,
        messagesSent: metrics.totalSent,
        messagesReplied: metrics.totalReplied,
        followupsCompleted:
          metrics.totalAccepted > 0
            ? Math.round((metrics.followupRate / 100) * metrics.totalAccepted)
            : 0,
        acceptanceRate: metrics.actionCompletionRate,
        replyRate: metrics.replyRate,
        conversionRate: metrics.followupRate,
        createdAt: now,
        updatedAt: now,
      });
      await this.cacheRepo.save(cache);
    }
  }

  /**
   * 从缓存记录构建指标对象
   *
   * @param cache 缓存记录
   * @returns 指标数据
   */
  private buildMetricsFromCache(cache: WeeklyReportCache): WeeklyMetrics {
    return {
      actionCompletionRate: cache.acceptanceRate ?? 0,
      replyRate: cache.replyRate ?? 0,
      followupRate: cache.conversionRate ?? 0,
      totalSuggestions: cache.totalSuggestions,
      totalAccepted: cache.acceptedSuggestions,
      totalSent: cache.messagesSent,
      totalReplied: cache.messagesReplied,
    };
  }

  /**
   * 获取周开始日期（周一）
   *
   * @param date 任意日期
   * @returns 该日期所在周的周一
   */
  private getWeekStartDate(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
