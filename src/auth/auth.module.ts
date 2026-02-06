import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
// 1. IMPORTANTE: Importar ConfigModule y ConfigService
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // 2. IMPORTANTE: Agregar ConfigModule aquí para que el inyector lo encuentre
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      // 3. Ahora el inyector sabrá qué es ConfigService
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // 4. Se asegura de usar la clave del .env: una_clave_secreta_muy_segura_2026_abc
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
