import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client';

// Everything we are willing to send over the wire. Note the absence of `password`.
const publicUserFields = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: publicUserFields });
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserFields,
    });
  }

  // Deliberately returns the full row: login needs the hash to compare against.
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      return await this.prisma.user.create({
        data: { ...dto, password: hashedPassword },
        select: publicUserFields,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already exists');
        }
      }
      throw new InternalServerErrorException();
    }
  }

  remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
      select: publicUserFields,
    });
  }
}
