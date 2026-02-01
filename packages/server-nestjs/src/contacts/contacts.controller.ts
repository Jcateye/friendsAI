import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

interface CreateContactDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  profile?: Record<string, any>;
  tags?: string[];
}

interface UpdateContactDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  profile?: Record<string, any>;
  tags?: string[];
}

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(createContactDto);
  }

  @Get()
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.contactsService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.update(id, updateContactDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}