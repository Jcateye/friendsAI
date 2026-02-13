/**
 * 飞书 Webhook 数据库迁移
 *
 * 创建 feishu_configs 和 feishu_webhook_logs 两张表
 */

export class FeishuWebhookMigration16999999999999 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建用户配置表
    await queryRunner.query(`
      CREATE TABLE feishu_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
        user_id UUID NOT NULL,
        app_token VARCHAR(255),
        table_id VARCHAR(255),
        webhook_url VARCHAR(255),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_feishu_configs_user_id ON feishu_configs(user_id);
    `);

    // 创建 Webhook 日志表
    await queryRunner.query(`
      CREATE TABLE feishu_webhook_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
        app_token VARCHAR(255) NOT NULL,
        table_id VARCHAR(255) NOT NULL,
        record_id VARCHAR(255) NOT NULL,
        button_id VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        payload JSONB,
        status SMALLINT DEFAULT 0,
        error_message TEXT,
        received_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      CREATE INDEX idx_feishu_webhook_logs_record ON feishu_webhook_logs(record_id);
      CREATE INDEX idx_feishu_webhook_logs_status ON feishu_webhook_logs(status, created_at);
    `);

    this.logger.log('数据库迁移完成');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_feishu_webhook_logs_status;
      DROP INDEX IF EXISTS idx_feishu_webhook_logs_record;
      DROP TABLE IF EXISTS feishu_webhook_logs;
      DROP TABLE IF EXISTS feishu_configs;
    `);

    this.logger.log('数据库回滚完成');
  }
}
