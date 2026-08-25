import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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

  // Returns null when missing. Used by JwtStrategy, where "no such user"
  // means 401 (bad credential), not 404 (no such resource).
  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserFields,
    });
  }

  // Throws 404 when missing. Used by the controller.
  async findOne(id: number) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
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

  async remove(id: number) {
    try {
      return await this.prisma.user.delete({
        where: { id },
        select: publicUserFields,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }
}
