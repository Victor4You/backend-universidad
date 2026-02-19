import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { User } from '../users/user.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseCompletion } from '../courses/entities/course-completion.entity';
import { CourseEnrollment } from '../courses/entities/course-enrollment.entity';

@Module({
  imports: [
    // Esto conecta las entidades con el servicio
    TypeOrmModule.forFeature([
      User,
      Course,
      CourseCompletion,
      CourseEnrollment,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
