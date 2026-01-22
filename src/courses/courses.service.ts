import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseCompletion } from './entities/course-completion.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import { put } from '@vercel/blob';

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
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  // CAMBIO: Usar variables de entorno para que Vercel pueda conectar
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
  ) {}

  async findAll() {
    const courses = await this.courseRepository.find({
      relations: ['estudiantesInscritos'], // Solo asegúrate que este nombre sea igual al de tu Entity
      order: { id: 'ASC' },
    });

    return courses.map((course) => ({
      ...course,
      estudiantes: course.estudiantesInscritos?.length || 0,
    }));
  }

  async findProgress(userId: number): Promise<string[]> {
    const completions = await this.completionRepository.find({
      where: { userId },
    });
    return completions.map((c) => c.courseId);
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

  // MODIFICADO: Manejo de actualización segura
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

  async registerCompletion(data: RegisterCompletionData) {
    const existing = await this.completionRepository.findOne({
      where: { userId: Number(data.userId), courseId: String(data.courseId) },
    });
    if (existing && existing.score >= 90) return existing;

    const completion = this.completionRepository.create({
      userId: Number(data.userId),
      courseId: String(data.courseId),
      score: data.score,
      survey: data.survey as Record<string, any>,
    });
    return await this.completionRepository.save(completion);
  }

  async findUsersBySucursal(sucursalId: string, query: string = '') {
    try {
      const allUsersFound: UniversidadUser[] = [];
      const maxPages = 20;

      for (let page = 1; page <= maxPages; page++) {
        // Log para debuggear conexión en Vercel
        const url = `${this.EXTERNAL_API_URL}/usuarios?q=${query}&take=20&page=${page}`;

        const response = await axios.get<APIResponse>(url, {
          headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` },
          timeout: 15000, // Timeout de 15 segundos
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
    // 1. Eliminamos inscripciones viejas para este curso
    await this.enrollmentRepository.delete({ courseId });

    // 2. Creamos las nuevas
    const newEnrollments = userIds.map((userId) =>
      this.enrollmentRepository.create({ courseId, userId }),
    );
    await this.enrollmentRepository.save(newEnrollments);

    // 3. Retornamos el curso actualizado con su nuevo conteo
    return this.findAll();
  }
  // 2. Filtro de cursos para la vista del estudiante
  async findCoursesByUser(userId: number): Promise<any[]> {
    // Cambiado a any[] para soportar el campo virtual
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
    });

    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const courses = await this.courseRepository.find({
      where: {
        id: In(courseIds),
      },
      relations: ['estudiantesInscritos'], // AÑADIDO: Carga la relación para contar
      order: { id: 'ASC' },
    });

    // AÑADIDO: Mapeo para calcular el número de estudiantes
    return courses.map((course) => ({
      ...course,
      estudiantes: course.estudiantesInscritos?.length || 0,
    }));
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
    // Borramos dependencias para evitar errores de llave foránea
    await this.enrollmentRepository.delete({ courseId: id });
    await this.completionRepository.delete({ courseId: id });

    // Borramos el curso
    return await this.courseRepository.delete(id);
  }
  async uploadFileToBlob(file: Express.Multer.File) {
    try {
      if (!file || !file.buffer) {
        throw new Error('El archivo no se cargó correctamente en memoria.');
      }

      const fileName = `courses/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

      // put() de vercel/blob acepta el buffer directamente
      // Esto funciona en local (si tienes el TOKEN en el .env) y en Vercel
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
