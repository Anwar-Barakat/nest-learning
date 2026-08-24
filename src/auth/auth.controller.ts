import { Controller, Post } from '@nestjs/common';
import { LoginDto } from '../users/dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(dto: LoginDto) {
    return this.authService.login(dto);
  }
}
