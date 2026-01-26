import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseCompletion } from './entities/course-completion.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import { put } from '@vercel/blob';
import { User } from '../users/user.entity';

// 1. Definimos la estructura del usuario que viene de la API externa
interface UniversidadUser {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  sucursalId?: number;
  sucursal?: {
    nombre: string;
  };
}

// 2. Definimos la forma de la respuesta de la API
interface APIResponse {
  data: UniversidadUser[];
  meta: any;
}

export class RegisterCompletionData {
  userId: string | number;
  courseId: string | number;
  score: number;
  survey?: Record<string, number>;
  userName?: string; // Corregido: Ahora TypeScript reconoce esta propiedad
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  private readonly EXTERNAL_API_URL =
    process.env.EXTERNAL_API_URL || 'http://192.168.13.170:3201/v1';

  private readonly MASTER_TOKEN =
    process.env.MASTER_TOKEN ||
    'Tyau4EiHXpVdp4bxwt4byTBg62h6fh3MHBlIc0gTeH5g13sXfBwOeX0vFcQXQcFV';

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseCompletion)
    private completionRepository: Repository<CourseCompletion>,
    @InjectRepository(CourseEnrollment)
    private enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll() {
    const courses = await this.courseRepository.find({
      relations: ['estudiantesInscritos'],
      order: { id: 'ASC' },
    });

    return courses.map((course) => ({
      ...course,
      estudiantes: course.estudiantesInscritos?.length || 0,
    }));
  }

  async findProgress(userId: number): Promise<string[]> {
    const externalUsername = `user_${userId}`;
    const user = await this.userRepository.findOne({
      where: { username: externalUsername },
    });

    if (!user) return [];

    const completions = await this.completionRepository.find({
      where: { userId: user.id },
    });

    return completions.map((c) => String(c.courseId));
  }

  async create(data: Partial<Course>): Promise<Course> {
    try {
      const newCourse = this.courseRepository.create(data);
      return await this.courseRepository.save(newCourse);
    } catch (error) {
      console.error('Error al guardar en DB:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Course>) {
    try {
      await this.courseRepository.update(id, data);
      return { message: 'Curso actualizado exitosamente' };
    } catch (error) {
      console.error('Error al actualizar curso:', error);
      return {
        message: 'Error al actualizar datos en la base de datos',
        error,
      };
    }
  }

  async findCoursesByUser(userId: number): Promise<any[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
    });

    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const courses = await this.courseRepository.find({
      where: {
        id: In(courseIds),
      },
      relations: ['estudiantesInscritos'],
      order: { id: 'ASC' },
    });

    return courses.map((course) => ({
      ...course,
      estudiantes: course.estudiantesInscritos?.length || 0,
    }));
  }

  async registerCompletion(completionData: RegisterCompletionData) {
    const { userId, courseId, score, survey, userName } = completionData;

    const externalUsername = `user_${userId}`;
    let user = await this.userRepository.findOne({
      where: { username: externalUsername },
    });

    if (!user) {
      try {
        user = this.userRepository.create({
          username: externalUsername,
          password: 'external_auth_user',
          name: userName || `Estudiante ${userId}`, // Prioriza el nombre real para el reporte
          email: `user${userId}@sistema.com`,
          role: 'user',
        });
        user = await this.userRepository.save(user);
      } catch (error: any) {
        if (error.code === '23505') {
          user = await this.userRepository.findOne({
            where: { username: externalUsername },
          });
        } else {
          throw error;
        }
      }
    }

    if (!user) {
      throw new Error(
        'No se pudo encontrar ni crear el usuario en la base de datos.',
      );
    }

    let completion = await this.completionRepository.findOne({
      where: { userId: user.id, courseId: String(courseId) },
    });

    if (completion) {
      completion.score = score;
      completion.survey = survey;
      completion.completedAt = new Date();
    } else {
      completion = this.completionRepository.create({
        userId: user.id,
        courseId: String(courseId),
        score: score,
        survey: survey,
      });
    }

    return await this.completionRepository.save(completion);
  }

  async findUsersBySucursal(sucursalId: string, query: string = '') {
    try {
      const allUsersFound: UniversidadUser[] = [];
      const maxPages = 20;

      for (let page = 1; page <= maxPages; page++) {
        const url = `${this.EXTERNAL_API_URL}/usuarios?q=${query}&take=20&page=${page}`;
        const response = await axios.get<APIResponse>(url, {
          headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` },
          timeout: 15000,
        });

        const data = response.data.data || [];
        if (data.length === 0) break;
        allUsersFound.push(...data);
      }

      return allUsersFound
        .filter((u) => String(u.sucursalId) === String(sucursalId))
        .map((u) => ({
          id: u.id,
          nombre: u.nombre,
          apellido: u.apellido,
          usuario: u.usuario,
          username: u.usuario,
          sucursalId: u.sucursalId,
          sucursalNombre: u.sucursal?.nombre || 'Sin nombre',
        }));
    } catch (error: any) {
      this.logger.error(`Error al buscar usuarios: ${error.message}`);
      return [];
    }
  }

  async assignUsersToCourse(courseId: string, userIds: number[]) {
    for (const id of userIds) {
      let user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        await this.userRepository.save(
          this.userRepository.create({
            id,
            username: `user_${id}`,
            name: `Usuario ${id}`,
            email: `user${id}@sistema.com`,
            password: 'external_auth_user',
          }),
        );
      }
    }

    await this.enrollmentRepository.delete({ courseId });

    const newEnrollments = userIds.map((userId) =>
      this.enrollmentRepository.create({ courseId, userId }),
    );
    await this.enrollmentRepository.save(newEnrollments);

    return this.findAll();
  }

  async getEnrolledStudents(courseId: string) {
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
    });

    if (enrollments.length === 0) return [];

    try {
      const allUsersFound: UniversidadUser[] = [];
      for (let page = 1; page <= 20; page++) {
        const response = await axios.get<APIResponse>(
          `${this.EXTERNAL_API_URL}/usuarios?take=20&page=${page}`,
          {
            headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` },
            timeout: 15000,
          },
        );
        const data = response.data.data || [];
        if (data.length === 0) break;
        allUsersFound.push(...data);
      }

      return enrollments.map((enrolled) => {
        const userApi = allUsersFound.find((u) => u.id === enrolled.userId);
        return {
          id: enrolled.userId,
          name: userApi
            ? `${userApi.nombre} ${userApi.apellido}`
            : `ID: ${enrolled.userId}`,
          username: userApi ? userApi.usuario : 'desconocido',
        };
      });
    } catch (error: any) {
      this.logger.error(`Error al sincronizar estudiantes: ${error.message}`);
      return enrollments.map((e) => ({
        id: e.userId,
        name: `ID: ${e.userId}`,
        username: 'error_conexion',
      }));
    }
  }

  async remove(id: string) {
    await this.enrollmentRepository.delete({ courseId: id });
    await this.completionRepository.delete({ courseId: id });
    return await this.courseRepository.delete(id);
  }

  async uploadFileToBlob(file: Express.Multer.File) {
    try {
      if (!file || !file.buffer) {
        throw new Error('El archivo no se cargó correctamente en memoria.');
      }
      const fileName = `courses/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      const blob = await put(fileName, file.buffer, {
        access: 'public',
      });
      return { url: blob.url };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error en subida: ${msg}`);
      throw new Error('Error al procesar el almacenamiento.');
    }
  }
}
