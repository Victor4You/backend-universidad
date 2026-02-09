import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module'; // Importa el nuevo módulo
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
      envFilePath: '.env', // Forzamos a buscar el archivo
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          entities: [
            User,
            Course,
            CourseCompletion,
            CourseEnrollment,
            Post,
            Comment,
          ],
          synchronize: false, // OBLIGATORIO: false en Vercel

          // CONFIGURACIÓN AGRESIVA PARA SERVERLESS
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          extra: isProduction
            ? {
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000, // Bajamos a 5 segundos para que no se quede colgado
                idleTimeoutMillis: 10000, // Cerramos conexiones inactivas rápido
                max: 1, // IMPORTANTE: En Serverless, 1 conexión por instancia es mejor
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
