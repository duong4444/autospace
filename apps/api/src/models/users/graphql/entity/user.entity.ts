import { Field, ObjectType } from '@nestjs/graphql';
import { User as UserType } from '@prisma/client';
import { RestrictProperties } from 'src/common/dtos/common.input';

// định nghĩa entity , class trung gian giữa prisma và gql

// @ObjectType đánh dấu lớp User là 1 type trong schema gql
// đảm bảo User chỉ có các thuộc tính cx tồn tại trong UserType(Prisma) && có đủ thuộc tính của UserType

@ObjectType()
export class User implements RestrictProperties<User, UserType> {
  @Field({ nullable: true })
  image: string;
  @Field({ nullable: true })
  name: string;
  uid: string;
  createdAt: Date;
  updatedAt: Date;
  // Todo Add below to make optional fields optional.
  // @Field({ nullable: true })
}
