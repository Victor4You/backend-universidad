import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module'; // Importa el nuevo módulo
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { CoursesModule } from './courses/courses.module';
import { ReportsController } from './reports/reports.controller';
import { User } from './users/user.entity';
import { Course } from './courses/entities/course.entity';
import { ReportsService } from './reports/reports.service';
import { CourseCompletion } from './courses/entities/course-completion.entity';
import { CourseEnrollment } from './courses/entities/course-enrollment.entity';

// Importaciones del módulo de Posts
import { PostsModule } from './posts/posts.module';
import { Post } from './posts/entities/post.entity';
import { Comment } from './posts/entities/comment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        User,
        Course,
        CourseCompletion,
        CourseEnrollment,
        Post,
        Comment,
      ],
      synchronize: false, // OBLIGATORIO en producción

      // Forzamos SSL de esta manera para que Neon no nos rebote
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
        // Parámetros para que la conexión no se muera al recargar
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      },
    }),
    TypeOrmModule.forFeature([
      User,
      Course,
      CourseCompletion,
      CourseEnrollment,
      Post,
      Comment,
    ]),
    AuthModule,
    CoursesModule,
    PostsModule,
  ],
  controllers: [UsersController, ReportsController],
  providers: [ReportsService],
})
export class AppModule {}
