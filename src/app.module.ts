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
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,

      // CAMBIO AQUÍ: SSL dinámico
      ssl: process.env.DB_HOST?.includes('localhost')
        ? false
        : { rejectUnauthorized: false },

      extra: process.env.DB_HOST?.includes('localhost')
        ? {}
        : {
            ssl: {
              rejectUnauthorized: false,
            },
          },
    }),
    CoursesModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService],
})
export class AppModule {}
