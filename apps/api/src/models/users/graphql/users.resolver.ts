import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entity/user.entity';
import { FindManyUserArgs, FindUniqueUserArgs } from './dtos/find.args';
import {
  RegisterWithCredentialsInput,
  RegisterWithProviderInput,
  LoginInput,
  LoginOutput,
} from './dtos/create-user.input';
import { UpdateUserInput } from './dtos/update-user.input';
import { checkRowLevelPermission } from 'src/common/auth/util';
import { GetUserType } from 'src/common/types';
import { AllowAuthenticated, GetUser } from 'src/common/auth/auth.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';

// <=> controller thao tác vs db qua service (model)

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Mutation(() => User)
  async createUserWithCredentials(
    @Args('createUserWithCredentialsInput') args: RegisterWithCredentialsInput,
  ) {
    return this.usersService.registerWithCredentials(args);
  }

  @Mutation(() => User)
  async createUserWithProvider(
    @Args('createUserWithProviderInput') args: RegisterWithProviderInput,
  ) {
    return this.usersService.registerWithProvider(args);
  }

  @Mutation(() => LoginOutput)
  async loginn(@Args('loginInput') args: LoginInput) {
    return this.usersService.login(args);
  }

  @AllowAuthenticated()
  @Query(() => User)
  whoami(@GetUser() user: GetUserType) {
    return this.usersService.findOne({ where: { uid: user.uid } });
  }

  @Query(() => [User], { name: 'users' })
  findAll(@Args() args: FindManyUserArgs) {
    return this.usersService.findAll(args);
  }

  @AllowAuthenticated()
  @Query(() => User, { name: 'user' })
  findOne(@Args() args: FindUniqueUserArgs) {
    return this.usersService.findOne(args);
  }

  // user: lấy từ header của req
  @AllowAuthenticated()
  @Mutation(() => User)
  async updateUser(
    @Args('updateUserInput') args: UpdateUserInput,
    @GetUser() user: GetUserType,
  ) {
    const userInfo = await this.prisma.user.findUnique({
      where: { uid: args.uid },
    });
    if (!userInfo) throw new Error('User not found');
    checkRowLevelPermission(user, userInfo.uid);
    return this.usersService.update(args);
  }

  @AllowAuthenticated()
  @Mutation(() => User)
  async removeUser(
    @Args() args: FindUniqueUserArgs,
    @GetUser() user: GetUserType,
  ) {
    const userInfo = await this.prisma.user.findUnique(args);
    if (!userInfo) throw new Error('User not found');

    checkRowLevelPermission(user, userInfo.uid);
    return this.usersService.remove(args);
  }
}
