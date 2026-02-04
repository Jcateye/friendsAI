import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestEntity } from './test.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('TypeORM Integration', () => {
  let repository: Repository<TestEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5434,
          username: 'postgres',
          password: 'postgres',
          database: 'friends_ai_db',
          autoLoadEntities: true,
          synchronize: true,
        }),
        TypeOrmModule.forFeature([TestEntity]),
      ],
    }).compile();

    repository = module.get<Repository<TestEntity>>(getRepositoryToken(TestEntity));
  });

  it('should be able to save and retrieve an entity', async () => {
    const testEntity = new TestEntity();
    testEntity.name = 'Test Name';
    
    const saved = await repository.save(testEntity);
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Test Name');
    
    const found = await repository.findOne({ where: { id: saved.id } });
    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Name');
  });
});