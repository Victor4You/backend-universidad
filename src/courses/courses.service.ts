// src/courses/courses.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseProgress } from './entities/course-progress.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(CourseProgress)
    private progressRepo: Repository<CourseProgress>,
  ) {}

  // REGISTRAR INTENTO (Nuevo método para auditoría o control de intentos)
  async registerAttempt(data: {
    userId: number;
    courseId: string;
    score: number;
  }) {
    // Aquí podrías crear una nueva tabla "CourseAttempts" si quieres historial,
    // pero por ahora usaremos la lógica de actualizar el progreso actual
    let progress = await this.progressRepo.findOne({
      where: { userId: data.userId, courseId: data.courseId },
    });

    if (!progress) {
      progress = this.progressRepo.create({ ...data, survey: null });
    } else {
      progress.score = data.score;
    }

    return await this.progressRepo.save(progress);
  }

  // REGISTRAR COMPLETADO Y ENCUESTA
  async registerCompletion(data: {
    userId: number;
    courseId: string;
    score: number;
    survey: any;
  }) {
    let progress = await this.progressRepo.findOne({
      where: { userId: data.userId, courseId: data.courseId },
    });

    if (!progress) {
      progress = this.progressRepo.create(data);
    } else {
      progress.score = data.score;
      progress.survey = data.survey;
      progress.completedAt = new Date();
    }

    return await this.progressRepo.save(progress);
  }

  async getUserProgress(userId: number): Promise<string[]> {
    const results = await this.progressRepo.find({
      where: { userId },
      select: ['courseId'],
    });
    return results.map((item) => item.courseId);
  }
}
