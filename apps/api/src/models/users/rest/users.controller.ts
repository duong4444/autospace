import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { CreateUser } from './dtos/create.dto';
import { UserQueryDto } from './dtos/query.dto';
import { UpdateUser } from './dtos/update.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UserEntity } from './entity/user.entity';
import { AllowAuthenticated, GetUser } from 'src/common/auth/auth.decorator';
import { GetUserType } from 'src/common/types';
import { checkRowLevelPermission } from 'src/common/auth/util';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @AllowAuthenticated()
  @ApiBearerAuth() // hien thi tren swagger ui
  @ApiCreatedResponse({ type: UserEntity }) // 201 , post
  @Post()
  create(@Body() createUserDto: CreateUser, @GetUser() user: GetUserType) {
    checkRowLevelPermission(user, createUserDto.uid);
    return this.prisma.user.create({ data: createUserDto });
  }

  // +skip, +take: chuyển từ string sang number vì query params luôn là string
  @ApiOkResponse({ type: [UserEntity] }) // 200 ,get,patch,delete
  @Get()
  findAll(
    @Query() { skip, take, order, sortBy, search, searchBy }: UserQueryDto,
  ) {
    return this.prisma.user.findMany({
      ...(skip ? { skip: +skip } : null),
      ...(take ? { take: +take } : null),
      // Computed property name ([sortBy])
      //sortBy là giá trị scalar của user: createdAt,name,...
      ...(sortBy ? { orderBy: { [sortBy]: order || 'asc' } } : null),
      ...(searchBy
        ? { where: { [searchBy]: { contains: search, mode: 'insensitive' } } }
        : null),
    });
  }

  @ApiOkResponse({ type: UserEntity })
  @Get(':uid')
  findOne(@Param('uid') uid: string) {
    return this.prisma.user.findUnique({ where: { uid } });
  }

  @ApiOkResponse({ type: UserEntity })
  @ApiBearerAuth()
  @AllowAuthenticated()
  @Patch(':uid')
  async update(
    @Param('uid') uid: string,
    @Body() updateUserDto: UpdateUser,
    @GetUser() user: GetUserType,
  ) {
    const userInfo = await this.prisma.user.findUnique({ where: { uid } });
    if (!userInfo) {
      throw new NotFoundException(`User with id ${uid} not found`);
    }
    checkRowLevelPermission(user, userInfo.uid);
    return this.prisma.user.update({
      where: { uid },
      data: updateUserDto,
    });
  }

  @ApiBearerAuth()
  @AllowAuthenticated()
  @Delete(':uid')
  async remove(@Param('uid') uid: string, @GetUser() user: GetUserType) {
    const userInfo = await this.prisma.user.findUnique({ where: { uid } });
    if (!userInfo) {
      throw new NotFoundException(`User with id ${uid} not found`);
    }
    checkRowLevelPermission(user, userInfo.uid);
    return this.prisma.user.delete({ where: { uid } });
  }
}
