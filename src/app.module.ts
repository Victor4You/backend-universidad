import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module'; // Importa el nuevo módulo
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UsersController } from './users/users.controller';
import { CoursesModule } from './courses/courses.module';

import { User } from './users/user.entity';
import { Course } from './courses/entities/course.entity';

import { CourseCompletion } from './courses/entities/course-completion.entity';
import { CourseEnrollment } from './courses/entities/course-enrollment.entity';
import { CourseSection } from './courses/entities/course-section.entity';
import { CourseProgress } from './courses/entities/course-progress.entity';
import { ReportsModule } from './reports/reports.module';

// Importaciones del módulo de Posts
import { PostsModule } from './posts/posts.module';
import { Post } from './posts/entities/post.entity';
import { Comment } from './posts/entities/comment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // DETECCIÓN INTELIGENTE DE ENTORNO
        const isVercel = config.get('VERCEL') === '1' || !!process.env.VERCEL;
        const isProduction =
          config.get('NODE_ENV') === 'production' || isVercel;

        // Si estamos en Vercel, forzamos SSL. Si estamos en local, usamos lo que diga el .env
        const shouldSSl = isVercel || config.get('DB_SSL') === 'true';
        return {
          type: 'postgres',
          host: isVercel ? config.get<string>('DB_HOST') : 'localhost',
          port: isVercel ? config.get<number>('DB_PORT') : 5433, // Tu puerto local 5433
          username: isVercel ? config.get<string>('DB_USER') : 'postgres',
          password: isVercel ? config.get<string>('DB_PASSWORD') : '123',
          database: isVercel ? config.get<string>('DB_NAME') : 'universidad_db',
          entities: [
            User,
            Course,
            CourseSection,
            CourseCompletion,
            CourseEnrollment,
            CourseProgress,
            Post,
            Comment,
          ],
          synchronize: !isProduction, // OBLIGATORIO: false en Vercel

          // CONFIGURACIÓN DE CONEXIÓN
          ssl: shouldSSl ? { rejectUnauthorized: false } : false,
          extra: shouldSSl
            ? {
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                idleTimeoutMillis: 30000,
                max: 1, // Limita a 1 conexión para no saturar Neon desde Vercel
              }
            : {},
        };
      },
    }),
    TypeOrmModule.forFeature([
      User,
      Course,
      CourseCompletion,
      CourseEnrollment,
      CourseProgress,
      Post,
      Comment,
    ]),
    AuthModule,
    CoursesModule,
    PostsModule,
    ReportsModule,
  ],
  controllers: [UsersController],
  providers: [],
})
export class AppModule {}
