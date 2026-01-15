import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseCompletion } from './entities/course-completion.entity';

// 1. Definimos la interfaz para los datos de entrada
interface RegisterCompletionData {
  userId: string | number;
  courseId: string | number;
  score: number;
  survey?: Record<string, number>; // Cambiamos 'any' por una estructura de objeto
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseCompletion)
    private completionRepository: Repository<CourseCompletion>,
  ) {}

  async findAll() {
    return await this.courseRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findProgress(userId: number) {
    const completions = await this.completionRepository.find({
      where: { userId },
    });
    return completions.map((c) => c.courseId);
  }

  async create(data: Partial<Course>) {
    const newCourse = this.courseRepository.create(data);
    return await this.courseRepository.save(newCourse);
  }

  async update(id: string, data: Partial<Course>) {
    await this.courseRepository.update(id, data);
    return { message: 'Curso actualizado' };
  }

  async registerCompletion(data: RegisterCompletionData) {
    const existing = await this.completionRepository.findOne({
      where: {
        userId: Number(data.userId),
        courseId: String(data.courseId),
      },
    });

    if (existing && existing.score >= 90) {
      return existing;
    }

    // 2. Aquí es donde estaba el error: tipamos explícitamente el objeto de creación
    const completion = this.completionRepository.create({
      userId: Number(data.userId),
      courseId: String(data.courseId),
      score: data.score,
      survey: data.survey as Record<string, any>, // Usamos un 'type assertion' seguro
    });

    return await this.completionRepository.save(completion);
  }
}
