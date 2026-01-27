import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseCompletion } from './entities/course-completion.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import { put } from '@vercel/blob';

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

interface APIResponse {
  data: UniversidadUser[];
  meta: any;
}

export class RegisterCompletionData {
  userId: number; // Cambiado a number para consistencia
  courseId: number; // Cambiado a number para consistencia
  score: number;
  survey?: Record<string, number>;
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

  // CORREGIDO: Ahora retorna Promise<number[]> para coincidir con la entidad
  async findProgress(userId: number): Promise<number[]> {
    const completions = await this.completionRepository.find({
      where: { userId },
    });
    return completions.map((c) => Number(c.courseId));
  }

  async create(data: Partial<Course>): Promise<Course> {
    const newCourse = this.courseRepository.create(data);
    return await this.courseRepository.save(newCourse);
  }

  async update(id: string, data: Partial<Course>) {
    try {
      await this.courseRepository.update(id, data);
      return { message: 'Curso actualizado exitosamente' };
    } catch (error) {
      this.logger.error('Error al actualizar curso:', error);
      return { message: 'Error al actualizar datos en la base de datos' };
    }
  }

  // CORREGIDO: Tipado de comparaciones y creación
  async registerCompletion(data: RegisterCompletionData) {
    const existing = await this.completionRepository.findOne({
      where: {
        userId: Number(data.userId),
        courseId: Number(data.courseId), // Convertido a Number
      },
    });

    if (existing && existing.score >= 90) return existing;

    const completion = this.completionRepository.create({
      userId: Number(data.userId),
      courseId: Number(data.courseId), // Convertido a Number
      score: data.score,
      survey: data.survey,
    });
    return await this.completionRepository.save(completion);
  }

  async findUsersBySucursal(sucursalId: string, query: string = '') {
    try {
      const allUsersFound: UniversidadUser[] = [];
      for (let page = 1; page <= 10; page++) {
        const url = `${this.EXTERNAL_API_URL}/usuarios?q=${query}&take=50&page=${page}`;
        const response = await axios.get<APIResponse>(url, {
          headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` },
          timeout: 10000,
        });
        const data = response.data.data || [];
        if (data.length === 0) break;
        allUsersFound.push(...data);
      }

      return allUsersFound
        .filter((u) => String(u.sucursalId) === String(sucursalId))
        .map((u) => ({
          id: u.id,
          name: `${u.nombre} ${u.apellido}`,
          username: u.usuario,
          sucursalNombre: u.sucursal?.nombre || 'Sin nombre',
        }));
    } catch (error) {
      return [];
    }
  }

  // ACTUALIZADO: Función para asignar con búsqueda exhaustiva
  async assignUsersToCourse(courseId: string, userIds: number[]) {
    // 1. Limpiar inscripciones previas
    await this.enrollmentRepository.delete({ courseId: Number(courseId) });

    if (userIds.length === 0) return this.findAll();

    // 2. Obtener datos de los usuarios desde la API externa
    // Buscamos a los usuarios necesarios para tener sus nombres reales
    const usersData = await this.findSpecificUsersFromApi(userIds);

    // 3. Crear nuevas inscripciones con los datos recuperados
    const newEnrollments = userIds.map((uId) => {
      const apiUser = usersData.find((u) => Number(u.id) === Number(uId));

      return this.enrollmentRepository.create({
        courseId: Number(courseId),
        userId: uId,
        // Si no lo encuentra en la API, intentamos mantener lo que sea mejor que un ID solo
        userName: apiUser
          ? `${apiUser.nombre} ${apiUser.apellido}`.trim()
          : `USUARIO ${uId}`,
        userUsername: apiUser ? apiUser.usuario : 'S/N',
      });
    });

    await this.enrollmentRepository.save(newEnrollments);
    return this.findAll();
  }

  // NUEVA FUNCIÓN AUXILIAR: Busca específicamente a los usuarios por ID o en varias páginas
  private async findSpecificUsersFromApi(
    ids: number[],
  ): Promise<UniversidadUser[]> {
    try {
      const allRecovered: UniversidadUser[] = [];

      // Consultamos las primeras páginas para encontrar a los usuarios
      // Aumentamos a 5 páginas de 100 para cubrir más rango (500 usuarios)
      for (let page = 1; page <= 5; page++) {
        const response = await axios.get<APIResponse>(
          `${this.EXTERNAL_API_URL}/usuarios?take=100&page=${page}`,
          { headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` } },
        );

        const data = response.data.data || [];
        if (data.length === 0) break;

        // Filtrar solo los que necesitamos para ahorrar memoria
        const matches = data.filter((u) => ids.includes(Number(u.id)));
        allRecovered.push(...matches);

        // Si ya encontramos todos los que buscábamos, dejamos de pedir páginas
        if (allRecovered.length >= ids.length) break;
      }

      return allRecovered;
    } catch (e) {
      this.logger.error('Error recuperando nombres de la API externa', e);
      return [];
    }
  }

  async findCoursesByUser(userId: number): Promise<any[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
    });
    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const courses = await this.courseRepository.find({
      where: { id: In(courseIds) },
      relations: ['estudiantesInscritos'],
      order: { id: 'ASC' },
    });

    return courses.map((course) => ({
      ...course,
      estudiantes: course.estudiantesInscritos?.length || 0,
    }));
  }

  // CORREGIDO: Ahora retorna los datos directamente de tu tabla (más rápido y persistente)
  async getEnrolledStudents(courseId: string) {
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: Number(courseId) },
    });

    return enrollments.map((e) => ({
      id: e.userId,
      name: e.userName || `ID: ${e.userId}`,
      username: e.userUsername || 'desconocido',
    }));
  }

  async remove(id: string) {
    const numericId = Number(id);
    await this.enrollmentRepository.delete({ courseId: numericId });
    await this.completionRepository.delete({ courseId: numericId });
    return await this.courseRepository.delete(numericId);
  }
  async getRealReportStats() {
    const enrollments = await this.enrollmentRepository.count();
    const completions = await this.completionRepository.find();

    // 1. Obtenemos todos los cursos para cruzar los nombres por ID
    const cursos = await this.courseRepository.find();

    const rangos = [
      { rango: '0-5', min: 0, max: 59, color: '#EF4444', cantidad: 0 },
      { rango: '6-7', min: 60, max: 75, color: '#F59E0B', cantidad: 0 },
      { rango: '7-8', min: 76, max: 85, color: '#10B981', cantidad: 0 },
      { rango: '8-9', min: 86, max: 95, color: '#3B82F6', cantidad: 0 },
      { rango: '9-10', min: 96, max: 100, color: '#8B5CF6', cantidad: 0 },
    ];

    completions.forEach((c) => {
      const rango = rangos.find((r) => c.score >= r.min && c.score <= r.max);
      if (rango) rango.cantidad++;
    });

    const distribucion = rangos.map((r) => ({
      ...r,
      porcentaje:
        completions.length > 0
          ? Math.round((r.cantidad / completions.length) * 100)
          : 0,
    }));

    const cursosMap = new Map();
    completions.forEach((c) => {
      // BUSCAMOS EL NOMBRE EN EL ARRAY DE CURSOS USANDO EL ID
      const cursoEncontrado = cursos.find((curso) => curso.id === c.courseId);
      const cursoNombre = cursoEncontrado?.nombre || 'Desconocido';

      if (!cursosMap.has(cursoNombre)) {
        cursosMap.set(cursoNombre, { suma: 0, count: 0, aprobados: 0 });
      }
      const stats = cursosMap.get(cursoNombre);
      stats.suma += c.score;
      stats.count++;
      if (c.score >= 60) stats.aprobados++;
    });

    const rendimiento = Array.from(cursosMap.entries())
      .map(([nombre, s]) => ({
        curso: nombre,
        promedio: Math.round(s.suma / s.count),
        aprobados: s.aprobados,
        reprobados: s.count - s.aprobados,
      }))
      .slice(0, 5);

    return {
      totalInscripciones: enrollments,
      totalCalificaciones: completions.length,
      distribucion,
      rendimiento,
    };
  }

  async generateExcelReport(filters: any): Promise<Buffer> {
    // Por ahora devuelve un buffer vacío para matar el error
    return Buffer.from('');
  }

  async uploadFileToBlob(file: Express.Multer.File) {
    try {
      const fileName = `courses/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      const blob = await put(fileName, file.buffer, { access: 'public' });
      return { url: blob.url };
    } catch (error) {
      throw new Error('Error al procesar el almacenamiento.');
    }
  }
}
