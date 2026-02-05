import { Test, TestingModule } from '@nestjs/testing';
import { BriefingService } from './briefing.service';
import { AiService } from '../../ai/ai.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, Conversation, Event } from '../../entities';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_CONTACT_ID = 'contact-uuid-1';

// Mock AiService
const mockAiService: jest.Mocked<AiService> = {
  generateEmbedding: jest.fn(),
  callAgent: jest.fn(),
};

// Mock Repositories
const mockContactRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

describe('BriefingService', () => {
  let service: BriefingService;
  let aiService: jest.Mocked<AiService>;
  let contactRepository: Repository<Contact>;

  // Define mock data at a higher scope
  const mockConversations: Conversation[] = [
    {
      id: 'conv-1', content: 'Discussed project status.', userId: MOCK_USER_ID, contactId: MOCK_CONTACT_ID,
      parsedData: {}, isArchived: false, embedding: [], createdAt: new Date('2024-01-10T00:00:00Z'), updatedAt: new Date(), contact: null, user: null,
    },
    {
      id: 'conv-2', content: 'Followed up on meeting.', userId: MOCK_USER_ID, contactId: MOCK_CONTACT_ID,
      parsedData: {}, isArchived: false, embedding: [], createdAt: new Date('2024-01-05T00:00:00Z'), updatedAt: new Date(), contact: null, user: null,
    },
  ];

  const mockEvents: Event[] = [
    {
      id: 'event-1', title: 'Coffee Meeting', description: 'Discussed Q1 goals.', contactId: MOCK_CONTACT_ID,
      details: {}, eventDate: new Date('2024-01-15T00:00:00Z'), embedding: [], createdAt: new Date(), updatedAt: new Date(), contact: null,
    },
  ];

  const mockContact: Contact = {
    id: MOCK_CONTACT_ID,
    name: 'John Doe',
    email: 'john@example.com',
    phone: null,
    company: 'Acme Corp',
    position: 'CEO',
    profile: { hobby: 'hiking', brief: { id: 'brief-1', content: 'Old', generatedAt: '2024-01-01T00:00:00Z', sourceHash: 'old-hash' } },
    tags: ['friend', 'investor'],
    userId: MOCK_USER_ID,
    events: mockEvents, // Populate with mock events
    conversations: mockConversations, // Populate with mock conversations
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    user: null,
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BriefingService,
        { provide: AiService, useValue: mockAiService },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepository },
      ],
    }).compile();

    service = module.get<BriefingService>(BriefingService);
    aiService = module.get<jest.Mocked<AiService>>(AiService); // Correctly type aiService
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));

    jest.clearAllMocks(); // Clear all mocks before each test
    // Reset individual mocks from mockAiService
    mockAiService.callAgent.mockResolvedValue('Generated briefing text');
    mockAiService.generateEmbedding.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBriefing', () => {
    beforeEach(() => {
      (contactRepository.findOne as jest.Mock).mockResolvedValue(mockContact);
      // Ensure find is called, but the data is already in mockContact
      aiService.callAgent.mockResolvedValue('Generated briefing text');
    });

    it('should throw NotFoundException if contact does not exist', async () => {
      (contactRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.generateBriefing(MOCK_CONTACT_ID, MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should call contactRepository.findOne with correct parameters', async () => {
      await service.generateBriefing(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(contactRepository.findOne).toHaveBeenCalledWith({
        where: { id: MOCK_CONTACT_ID, userId: MOCK_USER_ID },
        relations: ['conversations', 'events'],
      });
    });

    it('should extract relevant info and build a prompt for AiService', async () => {
      await service.generateBriefing(MOCK_CONTACT_ID, MOCK_USER_ID);

      expect(aiService.callAgent).toHaveBeenCalled();
      const prompt = aiService.callAgent.mock.calls[0][0]; // Access the actual prompt string passed

      // This is a partial match, allowing for minor whitespace differences
      expect(prompt).toContain(`Generate a concise pre-meeting briefing for a meeting with ${mockContact.name}.`);
      expect(prompt).toContain(`Contact Name: ${mockContact.name}`);
      expect(prompt).toContain(`Email: ${mockContact.email}`);
      expect(prompt).toContain(`Company: ${mockContact.company}`);
      expect(prompt).toContain('Recent Conversations:');
      expect(prompt).toContain('Discussed project status.');
      expect(prompt).toContain('Recent Events:');
      expect(prompt).toContain('Coffee Meeting');
    });

    it('should return the briefing snapshot generated by AiService', async () => {
      const expectedBriefing = 'Generated briefing text';
      aiService.callAgent.mockResolvedValue(expectedBriefing);
      jest.spyOn(crypto, 'randomUUID').mockReturnValue('brief-1');

      const briefing = await service.generateBriefing(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(briefing).toEqual(
        expect.objectContaining({
          id: 'brief-1',
          contact_id: MOCK_CONTACT_ID,
          content: expectedBriefing,
        }),
      );
    });
  });

  describe('refreshBriefing', () => {
    // Mock generateBriefing to avoid re-implementing its setup
    let generateBriefingSpy: jest.SpyInstance;

    beforeEach(() => {
      generateBriefingSpy = jest.spyOn(service, 'generateBriefing');
      generateBriefingSpy.mockResolvedValue({
        id: 'brief-1',
        contact_id: MOCK_CONTACT_ID,
        content: 'Refreshed briefing text',
        generated_at: new Date().toISOString(),
        source_hash: 'hash',
      });
    });

    it('should call generateBriefing with correct parameters', async () => {
      await service.refreshBriefing(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(generateBriefingSpy).toHaveBeenCalledWith(MOCK_CONTACT_ID, MOCK_USER_ID);
    });

    it('should return the refreshed briefing', async () => {
      const refreshedBriefing = await service.refreshBriefing(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(refreshedBriefing).toEqual(
        expect.objectContaining({
          id: 'brief-1',
          contact_id: MOCK_CONTACT_ID,
          content: 'Refreshed briefing text',
        }),
      );
    });
  });
});
