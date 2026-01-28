import { Module } from '@nestjs/common';
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
import { CourseEnrollment } from './courses/entities/course-enrollment.entity'; // 1. Importar la entidad

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
      entities: [User, Course, CourseCompletion, CourseEnrollment],
      synchronize: true,

      ssl: process.env.NODE_ENV === 'production',
      extra:
        process.env.NODE_ENV === 'production'
          ? {
              ssl: {
                rejectUnauthorized: false,
              },
            }
          : {},
    }),
    TypeOrmModule.forFeature([
      CourseCompletion,
      CourseEnrollment,
      Course,
      User,
    ]),
    CoursesModule,
  ],
  controllers: [AuthController, UsersController, ReportsController],
  providers: [AuthService, ReportsService],
})
export class AppModule {}
