import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestEntity } from './test.entity';

describe('TypeORM Integration', () => {
  let repository: jest.Mocked<Repository<TestEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(TestEntity),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get(getRepositoryToken(TestEntity));
  });

  it('should be able to save and retrieve an entity', async () => {
    const savedEntity = { id: 'entity-1', name: 'Test Name' } as TestEntity;
    repository.save.mockResolvedValue(savedEntity);
    repository.findOne.mockResolvedValue(savedEntity);

    const testEntity = new TestEntity();
    testEntity.name = 'Test Name';

    const saved = await repository.save(testEntity);
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Test Name');

    const found = await repository.findOne({ where: { id: saved.id } });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'entity-1' } });
    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Name');
  });
});
