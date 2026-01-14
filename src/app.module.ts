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
      // Prioriza las variables de Vercel, si no existen usa tus valores locales
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5433,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123',
      database: process.env.DB_NAME || 'universidad_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, 
      // SSL obligatorio en producción (Vercel/Nube) y desactivado en local
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