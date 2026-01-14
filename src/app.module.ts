// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { CoursesModule } from './courses/courses.module';

// Definimos constantes fuera para asegurar los tipos
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5433';
const dbUser = process.env.DB_USER || 'postgres';
const dbPass = process.env.DB_PASSWORD || '123';
const dbName = process.env.DB_NAME || 'universidad_db';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: dbHost,
      port: parseInt(dbPort, 10),
      username: dbUser,
      password: dbPass,
      database: dbName,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
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