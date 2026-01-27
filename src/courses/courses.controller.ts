import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Header,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoursesService, RegisterCompletionData } from './courses.service';
import { Course } from './entities/course.entity';
import { ReportsService } from '../reports/reports.service';
// Usamos import tipo objeto para evitar el error TS1272 en Vercel/isolatedModules
import * as Express from 'express';

@Controller('courses')
export class CoursesController {
  // AÑADIDO: Inyectamos ReportsService en el constructor
  constructor(
    private readonly coursesService: CoursesService,
    private readonly reportsService: ReportsService,
  ) {}

  // CAMBIO: Esta es la ruta que Vercel intentaba llamar.
  // La dejamos como GET para que sea más ligera.
  @Get('export')
  async export(@Res() res: Express.Response, @Query() filters: any) {
    try {
      const format = filters.format || 'excel';
      const buffer = await this.reportsService.generateFile(format, filters);

      const contentTypes: Record<string, string> = {
        pdf: 'application/pdf',
        excel:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
      };

      // Configuración de cabeceras específica para que Vercel no corte la descarga
      res.set({
        'Content-Type': contentTypes[format] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="reporte-${Date.now()}.${format}"`,
        'Content-Length': buffer.length,
      });

      res.send(buffer);
    } catch (error) {
      console.error('Error exportando reporte:', error);
      res.status(500).json({ message: error.message });
    }
  }

  // ======================================================
  // 1. RUTAS DE CONSULTA ESPECÍFICAS (Deben ir PRIMERO)
  // ======================================================

  /**
   * Obtiene los cursos en los que un estudiante específico está inscrito.
   * Usado por el dashboard del estudiante.
   */
  @Get('enrolled/:userId')
  async findCoursesByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.coursesService.findCoursesByUser(userId);
  }

  /**
   * Obtiene los IDs de los cursos que el usuario ya completó.
   * Activa los "checks" verdes y bloquea repeticiones.
   */
  @Get('user-progress')
  async findProgress(@Query('userId', ParseIntPipe) userId: number) {
    return this.coursesService.findProgress(userId);
  }

  /**
   * Busca usuarios en la API externa por sucursal.
   */
  @Get('users/sucursal/:sucursalId')
  async findUsers(
    @Param('sucursalId') sucursalId: string,
    @Query('q') query: string,
  ) {
    return this.coursesService.findUsersBySucursal(sucursalId, query);
  }

  // ======================================================
  // 2. RUTAS GENERALES Y DE RECURSOS
  // ======================================================

  /**
   * Lista todos los cursos (Vista de Admin/Profesor).
   */
  @Get()
  async findAll() {
    return this.coursesService.findAll();
  }

  /**
   * Obtiene la lista de nombres/usuarios inscritos en un curso.
   */
  @Get(':id/students')
  async getEnrolledStudents(@Param('id') id: string) {
    return this.coursesService.getEnrolledStudents(id);
  }

  // ======================================================
  // 3. RUTAS DE ACCIÓN (POST, PATCH, DELETE)
  // ======================================================

  /**
   * Sube archivos a Vercel Blob usando memoria (evita error EROFS).
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    return this.coursesService.uploadFileToBlob(file);
  }

  /**
   * Registra cuando un alumno termina un examen.
   */
  @Post('register-completion')
  async registerCompletion(@Body() completionData: RegisterCompletionData) {
    return this.coursesService.registerCompletion(completionData);
  }

  /**
   * Asigna o actualiza la lista de estudiantes de un curso.
   */
  @Post(':id/students')
  async assignStudents(
    @Param('id') courseId: string,
    @Body('userIds') userIds: number[],
  ) {
    return this.coursesService.assignUsersToCourse(courseId, userIds);
  }

  /**
   * Crea un nuevo curso.
   */
  @Post()
  async create(@Body() courseData: any) {
    return this.coursesService.create(courseData);
  }

  /**
   * Actualiza datos de un curso (usamos PATCH como pide el frontend).
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<Course>) {
    return this.coursesService.update(id, updateData);
  }

  /**
   * Elimina un curso y sus dependencias.
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  // Esta ruta es antigua, si tu frontend usa la de arriba (@Get('export')),
  // podrías borrar esta más adelante.
  @Post('export-report')
  async exportReport(@Body() body: any, @Res() res: Express.Response) {
    const buffer = await this.coursesService.generateExcelReport(body);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('reports/stats')
  async getStats() {
    return this.coursesService.getRealReportStats();
  }
}
