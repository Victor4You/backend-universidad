// src/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity';
import { CourseCompletion } from './entities/course-completion.entity';
// 1. Importamos la nueva entidad de inscripciones
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { User } from '../users/user.entity'; // <-- IMPORTANTE: Ruta según tu estructura

@Module({
  imports: [
    // 2. La agregamos aquí para que TypeORM cree la tabla en la DB
    TypeOrmModule.forFeature([
      Course,
      CourseCompletion,
      CourseEnrollment,
      User,
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
