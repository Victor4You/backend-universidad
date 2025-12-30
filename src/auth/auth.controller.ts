// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

export class LoginDto {
  username!: string;
  password!: string;
}

export class RegisterDto {
  username!: string;
  password!: string;
  name!: string;
  email!: string;
  role!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.validateUser(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // Ahora el servicio acepta este argumento gracias al parámetro '_'
    return await this.authService.register(registerDto);
  }
}
