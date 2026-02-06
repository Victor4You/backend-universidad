// src/auth/auth.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

// Es mejor definirlos como clases simples para validación futura
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

@Controller('auth') // Nota: Si en AppModule usaste un prefijo global como 'v1', la ruta será /v1/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.validateUser(loginDto);
    if (!result) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return result;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }
}
