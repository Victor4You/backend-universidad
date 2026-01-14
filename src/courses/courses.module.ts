import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseProgress } from './entities/course-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseProgress])],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
