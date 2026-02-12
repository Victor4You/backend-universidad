import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseCompletion } from './entities/course-completion.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import { put } from '@vercel/blob';
import { CourseProgress } from './entities/course-progress.entity';
import { ConfigService } from '@nestjs/config';

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
  userId: number;
  courseId: number;
  score: number;
  survey?: Record<string, number>;
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  // CONFIGURACIÓN DINÁMICA: Funciona en Local (127.0.0.1) y en Vercel via Env
  private readonly EXTERNAL_API_URL =
    process.env.EXTERNAL_API_URL || 'http://127.0.0.1:3201/v1';
  private readonly MASTER_TOKEN =
    process.env.MASTER_TOKEN ||
    'Tyau4EiHXpVdp4bxwt4byTBg62h6fh3MHBlIc0gTeH5g13sXfBwOeX0vFcQXQcFV';

  constructor(
    private configService: ConfigService,
    @InjectRepository(Course) private courseRepository: Repository<Course>,
    @InjectRepository(CourseCompletion)
    private completionRepository: Repository<CourseCompletion>,
    @InjectRepository(CourseEnrollment)
    private enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(CourseProgress)
    private courseProgressRepository: Repository<CourseProgress>,
  ) {}
  private get externalApiUrl(): string {
    const isVercel =
      !!this.configService.get('VERCEL') ||
      process.env.NODE_ENV === 'production';

    if (isVercel) {
      return this.configService.get<string>('EXTERNAL_API_URL') || '';
    } else {
      // Intentamos obtener la IP del .env.local, si no, usamos la que me acabas de dar
      const envIp = this.configService.get<string>('EXTERNAL_API_URL_LOCAL');
      return envIp || 'http://192.168.13.170:3201/v1';
    }
  }
  private get masterToken(): string {
    // Aseguramos string para evitar errores de tipo
    return (
      this.configService.get<string>('MASTER_TOKEN') ||
      'Tyau4EiHXpVdp4bxwt4byTBg62h6fh3MHBlIc0gTeH5g13sXfBwOeX0vFcQXQcFV'
    );
  }
  // --- MÉTODOS DE CURSOS ---

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

  async remove(id: string) {
    const numericId = Number(id);
    await this.enrollmentRepository.delete({ courseId: numericId });
    await this.completionRepository.delete({ courseId: numericId });
    return await this.courseRepository.delete(numericId);
  }

  // --- MÉTODOS DE USUARIOS Y API EXTERNA ---

  async findUsersBySucursal(sucursalId: string, query: string = '') {
    try {
      const baseUrl = this.externalApiUrl.replace(/\/$/, '');
      const allUsersFound: UniversidadUser[] = [];

      // Ahora recorremos las páginas correctamente
      for (let page = 1; page <= 2; page++) {
        const url = `${baseUrl}/usuarios?q=${query}&take=50&page=${page}`;

        this.logger.log(`Consultando API: ${url}`);

        const response = await axios.get<APIResponse>(url, {
          headers: {
            Authorization: `Bearer ${this.masterToken.trim()}`,
            'ngrok-skip-browser-warning': 'true',
          },
          timeout: 5000,
        });

        const data = response.data?.data || [];
        if (data.length === 0) break;
        allUsersFound.push(...data);
      }

      return allUsersFound
        .filter((u) => {
          if (!sucursalId || ['0', 'undefined', 'null'].includes(sucursalId))
            return true;
          return String(u.sucursalId) === String(sucursalId);
        })
        .map((u) => ({
          id: u.id,
          name: `${u.nombre} ${u.apellido}`.trim(),
          username: u.usuario,
          sucursalNombre: u.sucursal?.nombre || 'Sin sucursal',
        }));
    } catch (error) {
      this.logger.error(`Error conexión API Usuarios: ${error.message}`);
      return [];
    }
  }

  async assignUsersToCourse(courseId: string, userIds: number[]) {
    // Limpiamos inscripciones previas
    await this.enrollmentRepository.delete({ courseId: Number(courseId) });
    if (userIds.length === 0) return this.findAll();

    // Buscamos los datos reales de los usuarios para guardar nombre y username (desnormalizado para velocidad)
    const usersData = await this.findSpecificUsersFromApi(userIds);

    const newEnrollments = userIds.map((uId) => {
      const apiUser = usersData.find((u) => Number(u.id) === Number(uId));
      return this.enrollmentRepository.create({
        courseId: Number(courseId),
        userId: uId,
        userName: apiUser
          ? `${apiUser.nombre} ${apiUser.apellido}`.trim()
          : `USUARIO ${uId}`,
        userUsername: apiUser ? apiUser.usuario : 'S/N',
      });
    });

    await this.enrollmentRepository.save(newEnrollments);
    return this.findAll();
  }

  private async findSpecificUsersFromApi(
    ids: number[],
  ): Promise<UniversidadUser[]> {
    try {
      const baseUrl = this.externalApiUrl.replace(/\/$/, '');
      const allRecovered: UniversidadUser[] = [];

      for (let page = 1; page <= 5; page++) {
        const url = `${baseUrl}/usuarios?take=100&page=${page}`;

        const response = await axios.get<APIResponse>(url, {
          headers: {
            Authorization: `Bearer ${this.masterToken.trim()}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });

        const data = response.data.data || [];
        if (data.length === 0) break;
        const matches = data.filter((u) => ids.includes(Number(u.id)));
        allRecovered.push(...matches);
        if (allRecovered.length >= ids.length) break;
      }
      return allRecovered;
    } catch (e) {
      this.logger.error(`Error en findSpecificUsers: ${e.message}`);
      return [];
    }
  }

  // --- PROGRESO Y COMPLETITUD ---

  async registerCompletion(data: RegisterCompletionData) {
    const existing = await this.completionRepository.findOne({
      where: { userId: Number(data.userId), courseId: Number(data.courseId) },
    });
    if (existing && existing.score >= 90) return existing;

    const completion = this.completionRepository.create({
      userId: Number(data.userId),
      courseId: Number(data.courseId),
      score: data.score,
      survey: data.survey,
    });
    return await this.completionRepository.save(completion);
  }

  async findProgress(userId: number): Promise<number[]> {
    const completions = await this.completionRepository.find({
      where: { userId },
    });
    return completions.map((c) => Number(c.courseId));
  }

  async saveProgress(data: {
    courseId: number;
    userId: number;
    viewedVideos: number[];
    viewedPdfs: number[];
    attempts: number;
  }) {
    let progress = await this.courseProgressRepository.findOne({
      where: { courseId: Number(data.courseId), userId: Number(data.userId) },
    });

    if (!progress) {
      progress = this.courseProgressRepository.create({
        courseId: Number(data.courseId),
        userId: Number(data.userId),
        viewedVideos: [],
        viewedPdfs: [],
        attempts: 0,
      });
    }

    progress.viewedVideos = data.viewedVideos;
    progress.viewedPdfs = data.viewedPdfs;
    progress.attempts = data.attempts;

    return this.courseProgressRepository.save(progress);
  }

  async getProgress(userId: number, courseId: number) {
    const progress = await this.courseProgressRepository.findOne({
      where: { courseId: Number(courseId), userId: Number(userId) },
    });

    if (!progress) return { viewedVideos: [], viewedPdfs: [], attempts: 0 };
    return {
      viewedVideos: progress.viewedVideos || [],
      viewedPdfs: progress.viewedPdfs || [],
      attempts: progress.attempts || 0,
    };
  }

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

  // --- REPORTES Y ARCHIVOS ---

  async getRealReportStats() {
    const enrollments = await this.enrollmentRepository.count();
    const completions = await this.completionRepository.find();
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

    const cursosMap = new Map();
    completions.forEach((c) => {
      const cursoEncontrado = cursos.find((curso) => curso.id === c.courseId);
      const cursoNombre = cursoEncontrado?.nombre || 'Desconocido';
      if (!cursosMap.has(cursoNombre)) {
        cursosMap.set(cursoNombre, { suma: 0, count: 0, aprobados: 0 });
      }
      const s = cursosMap.get(cursoNombre);
      s.suma += c.score;
      s.count++;
      if (c.score >= 60) s.aprobados++;
    });

    return {
      totalInscripciones: enrollments,
      totalCalificaciones: completions.length,
      distribucion: rangos.map((r) => ({
        ...r,
        porcentaje:
          completions.length > 0
            ? Math.round((r.cantidad / completions.length) * 100)
            : 0,
      })),
      rendimiento: Array.from(cursosMap.entries())
        .map(([nombre, s]) => ({
          curso: nombre,
          promedio: Math.round(s.suma / s.count),
          aprobados: s.aprobados,
          reprobados: s.count - s.aprobados,
        }))
        .slice(0, 5),
    };
  }

  async uploadFileToBlob(file: Express.Multer.File) {
    try {
      const fileName = `courses/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

      // Mantenemos tu integración con Vercel Blob
      const blob = await put(fileName, file.buffer, {
        access: 'public',
        addRandomSuffix: true, // Evita colisiones de nombres
      });

      this.logger.log(`Archivo subido exitosamente: ${blob.url}`);
      return { url: blob.url };
    } catch (error) {
      this.logger.error(`Error en uploadFileToBlob: ${error.message}`);
      throw new Error('Error al procesar el almacenamiento en la nube.');
    }
  }

  async generateExcelReport(filters: any): Promise<Buffer> {
    return Buffer.from('');
  }
}
