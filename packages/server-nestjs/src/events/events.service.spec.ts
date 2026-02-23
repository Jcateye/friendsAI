import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { Event } from '../entities';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: jest.Mocked<Repository<Event>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepository = module.get(getRepositoryToken(Event));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when contactId is missing', async () => {
    await expect(
      service.create({
        title: '新年',
        contactId: '   ',
      }),
    ).rejects.toThrow(new BadRequestException('contactId is required'));
  });

  it('should persist normalized eventDate from eventDate field', async () => {
    const saved = { id: 'event-1' } as Event;
    eventRepository.create.mockReturnValue(saved);
    eventRepository.save.mockResolvedValue(saved);

    await service.create({
      title: '新年',
      contactId: 'contact-1',
      eventDate: '2023-01-22T00:00:00.000Z',
    });

    const payload = eventRepository.create.mock.calls[0][0] as Partial<Event>;
    expect(payload.contactId).toBe('contact-1');
    expect(payload.eventDate).toEqual(new Date('2023-01-22T00:00:00.000Z'));
  });

  it('should fallback to details.occurredAt when eventDate is absent', async () => {
    const saved = { id: 'event-2' } as Event;
    eventRepository.create.mockReturnValue(saved);
    eventRepository.save.mockResolvedValue(saved);

    await service.create({
      title: '春节',
      contactId: 'contact-2',
      details: {
        occurredAt: '2023-01-21T00:00:00.000Z',
      },
    });

    const payload = eventRepository.create.mock.calls[0][0] as Partial<Event>;
    expect(payload.eventDate).toEqual(new Date('2023-01-21T00:00:00.000Z'));
  });

  it('should set eventDate to undefined when input date is invalid', async () => {
    const saved = { id: 'event-3' } as Event;
    eventRepository.create.mockReturnValue(saved);
    eventRepository.save.mockResolvedValue(saved);

    await service.create({
      title: '无效时间',
      contactId: 'contact-3',
      eventDate: 'not-a-date',
    });

    const payload = eventRepository.create.mock.calls[0][0] as Partial<Event>;
    expect(payload.eventDate).toBeUndefined();
  });
});
