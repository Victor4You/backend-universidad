// src/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity'; //
import { CourseCompletion } from './entities/course-completion.entity'; //

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseCompletion]), //
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
