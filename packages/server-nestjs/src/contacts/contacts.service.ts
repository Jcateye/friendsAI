import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, SelectQueryBuilder } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CreateContactDto, UpdateContactDto, ContactFilter } from './dtos/contact.dto';
import { User } from '../entities/user.entity';
import { Briefing } from '../entities/briefing.entity';
import { Conversation } from '../entities/conversation.entity'; // For 'recent' filter

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Briefing)
    private briefingRepository: Repository<Briefing>,
    @InjectRepository(Conversation) // Inject ConversationRepository for 'recent' filter
    private conversationsRepository: Repository<Conversation>,
  ) {}

  async create(userId: string, createContactDto: CreateContactDto): Promise<Contact> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const newContact = this.contactsRepository.create({ ...createContactDto, user });

    // Initialize an empty briefing if not provided, or ensure it's linked
    let briefing = this.briefingRepository.create();
    newContact.briefing = briefing;
    briefing.contact = newContact; // Ensure inverse relation is set

    await this.briefingRepository.save(briefing); // Save briefing first to get its ID
    await this.contactsRepository.save(newContact); // Then save contact

    // Reload contact with briefing
    const savedContact = await this.contactsRepository.findOne({
      where: { id: newContact.id },
      relations: ['briefing'],
    });
    if (!savedContact) {
      throw new NotFoundException('Failed to retrieve created contact');
    }
    return savedContact;
  }

  async findAll(userId: string): Promise<Contact[]> {
    return this.contactsRepository.find({
      where: { user: { id: userId } },
      relations: ['briefing'],
    });
  }

  async findOne(userId: string, id: string): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['briefing'],
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async update(userId: string, id: string, updateContactDto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({ where: { id, user: { id: userId } } });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    const updated = await this.contactsRepository.save({ ...contact, ...updateContactDto });
    const savedContact = await this.contactsRepository.findOne({
      where: { id: updated.id },
      relations: ['briefing'],
    });
    if (!savedContact) {
      throw new NotFoundException('Failed to retrieve updated contact');
    }
    return savedContact;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.contactsRepository.delete({ id, user: { id: userId } });
    if (result.affected === 0) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  async getList(
    userId: string,
    filter: ContactFilter = ContactFilter.ALL,
    search?: string,
  ): Promise<Contact[]> {
    let queryBuilder = this.contactsRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.briefing', 'briefing')
      .where('contact.user.id = :userId', { userId });

    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(contact.name ILIKE :search OR contact.email ILIKE :search OR contact.phone ILIKE :search OR contact.company ILIKE :search OR contact.position ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    switch (filter) {
      case ContactFilter.RECENT:
        // Order by the most recent conversation or event associated with the contact
        // This requires joining Conversations/Events and ordering by their updatedAt
        queryBuilder = queryBuilder
          .leftJoin('contact.conversations', 'conversation')
          .leftJoin('contact.events', 'event')
          .orderBy(
            'GREATEST(conversation.updatedAt, event.updatedAt, contact.updatedAt)',
            'DESC',
            'NULLS LAST', // Handle cases where conversation/event might be null
          );
        break;
      case ContactFilter.PENDING:
        // Filter contacts that have pending todos in their briefing
        queryBuilder = queryBuilder.andWhere(
          'briefing.pendingTodos IS NOT NULL AND array_length(briefing.pendingTodos, 1) > 0',
        );
        break;
      case ContactFilter.STARRED:
        queryBuilder = queryBuilder.andWhere('contact.isStarred = :isStarred', { isStarred: true });
        break;
      case ContactFilter.ALL:
      default:
        // Default ordering for ALL might be by updated date or name
        queryBuilder = queryBuilder.orderBy('contact.updatedAt', 'DESC');
        break;
    }

    return queryBuilder.getMany();
  }
}
