import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() user: User) {
    return this.usersService.create(user);
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('count')
  async count() {
    const total = await this.usersService.count();
    return { total };
  }

  @Get(':email')
  async findOne(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Put(':id/age')
  async updateAge(@Param('id') id: string, @Body('age') age: number) {
    return this.usersService.updateAge(id, age);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.delete(id);
  }
}
