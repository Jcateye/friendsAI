import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';

interface CreateContactDto {
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  profile?: Record<string, any>;
  tags?: string[];
}

interface UpdateContactDto {
  name?: string;
  displayName?: string;
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
  create(@Request() req: any, @Body() createContactDto: CreateContactDto) {
    const name = createContactDto.name ?? createContactDto.displayName;
    return this.contactsService.create(
      {
        ...createContactDto,
        name,
      },
      req.user?.id,
    );
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.contactsService.findAll(req.user?.id, page, limit);
  }

  @Get(':id/context')
  getContext(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.getContactContext(id, req.user?.id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.findOne(id, req.user?.id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    const name = updateContactDto.name ?? updateContactDto.displayName;
    return this.contactsService.update(
      id,
      {
        ...updateContactDto,
        name,
      },
      req.user?.id,
    );
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.remove(id, req.user?.id);
  }
}
