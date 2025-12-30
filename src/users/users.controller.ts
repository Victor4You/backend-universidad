// src/users/users.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Obtiene el perfil de un usuario desde la API externa (IP .170)
   * Ruta final: GET /v1/users/user/:username
   */
  @Get('user/:username')
  async getUserProfile(
    @Param('username') username: string,
  ): Promise<Record<string, any>> {
    // Llamamos al servicio que ya tiene configurada la ruta /usuarios/usuario/
    const user = await this.authService.getUserProfile(username);

    if (!user) {
      throw new NotFoundException(
        `El usuario "${username}" no fue encontrado en la API externa`,
      );
    }

    // Retornamos el objeto tal cual lo entrega la API externa
    return user;
  }
}
