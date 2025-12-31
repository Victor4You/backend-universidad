// src/app.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service'; // Importar
import { UsersController } from './users/users.controller';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService],
})
export class AppModule {}
