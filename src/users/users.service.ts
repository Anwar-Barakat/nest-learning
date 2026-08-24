import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(dto: CreateUserDto) {
    return this.prisma.user.create({ data: dto });
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}
