// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: (process.env.DB_HOST as string) || 'localhost',
      port: parseInt((process.env.DB_PORT as string) || '5433', 10),
      username: (process.env.DB_USER as string) || 'postgres',
      password: (process.env.DB_PASSWORD as string) || '123',
      database: (process.env.DB_NAME as string) || 'universidad_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Esto creará las tablas automáticamente en Neon
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
    }),
    CoursesModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService],
})
export class AppModule {}