import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Request() req: any, @Body() createContactDto: CreateContactDto = {}) {
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
  @ApiOperation({ summary: 'Get all contacts with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.contactsService.findAll(req.user?.id, page, limit);
  }

  @Get(':id/context')
  @ApiOperation({ summary: 'Get contact context by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID', type: String })
  @ApiResponse({ status: 200, description: 'Contact context retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  getContext(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.getContactContext(id, req.user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID', type: String })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.findOne(id, req.user?.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID', type: String })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
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
  @ApiOperation({ summary: 'Delete a contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID', type: String })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.remove(id, req.user?.id);
  }
}
