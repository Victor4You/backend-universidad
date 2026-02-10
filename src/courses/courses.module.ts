// src/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity';
import { CourseCompletion } from './entities/course-completion.entity';
import { CourseSection } from './entities/course-section.entity';
// 1. Importamos la nueva entidad de inscripciones
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { ReportsService } from '../reports/reports.service';
import { User } from '../users/user.entity';

@Module({
  imports: [
    // 2. La agregamos aquí para que TypeORM cree la tabla en la DB
    // Agregamos User porque ReportsService lo necesita para los JOINs
    TypeOrmModule.forFeature([
      Course,
      CourseCompletion,
      CourseSection,
      CourseEnrollment,
      User,
    ]),
  ],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    ReportsService, // Esto permite que el controlador use el servicio
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
