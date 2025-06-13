import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/common/types';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    // Reflector lấy metadata gắn bởi @SetMetadata
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  // ExecutionContext lấy thông tin request hiện tại
  // CanActivate là guard interface dùng để bảo vệ route , ktra dkien truy cap trc khi xu ly 1 request

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    // lấy req từ context (là obj request chứa headers,user,...)
    const req = ctx.getContext().req;

    await this.authenticateUser(req);

    return this.authorizeUser(req, context);
  }

  private async authenticateUser(req: any): Promise<void> {
    const bearerHeader = req.headers.authorization;
    // Bearer eylskfdjlsdf309
    const token = bearerHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('No token provided.');
    }

    try {
      const payload = await this.jwtService.verify(token);
      const uid = payload.uid;
      if (!uid) {
        throw new UnauthorizedException(
          'Invalid token. No uid present in the token.',
        );
      }

      const user = await this.prisma.user.findUnique({ where: { uid } });
      if (!user) {
        throw new UnauthorizedException(
          'Invalid token. No user present with the uid.',
        );
      }

      console.log('jwt payload: ', payload);
      req.user = payload;
    } catch (err) {
      console.error('Token validation error:', err);
      throw err;
    }

    if (!req.user) {
      throw new UnauthorizedException('Invalid token.');
    }
  }

  private async authorizeUser(
    req: any,
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredRoles = this.getMetadata<Role[]>('roles', context);
    const userRoles = await this.getUserRoles(req.user.uid);
    req.user.roles = userRoles;

    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('chạy vào đây nếu role rỗng');
      return true;
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }

  private getMetadata<T>(key: string, context: ExecutionContext): T {
    return this.reflector.getAllAndOverride<T>(key, [
      context.getHandler(), // lấy metadata từ method
      context.getClass(), // lấy metadata từ class
    ]);
  }

  private async getUserRoles(uid: string): Promise<Role[]> {
    const roles: Role[] = [];

    const rolePromises = [
      this.prisma.admin.findUnique({ where: { uid } }),
      // Add promises for other role models here
    ];

    const [admin] = await Promise.all(rolePromises);
    admin && roles.push('admin');
    console.log('roles trong getUserRoles ', roles);

    return roles;
  }
}
