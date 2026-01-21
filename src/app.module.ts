import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { join } from 'path';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5433),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        // Usamos join correctamente para las entidades
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        // Sincronización solo fuera de producción
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        ssl: true,
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }),
    }),
    CoursesModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService],
})
export class AppModule {}
