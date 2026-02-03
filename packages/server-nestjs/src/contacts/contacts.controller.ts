import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto, ContactFilter } from './dtos/contact.dto';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: { id: string };
}

@UseGuards(AuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Req() req: RequestWithUser, @Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(req.user.id, createContactDto);
  }

  @Get()
  getList(
    @Req() req: RequestWithUser,
    @Query('filter') filter?: ContactFilter,
    @Query('search') search?: string,
  ) {
    return this.contactsService.getList(req.user.id, filter, search);
  }

  @Get(':id')
  findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.contactsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.update(req.user.id, id, updateContactDto);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.contactsService.remove(req.user.id, id);
  }
}
