import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
  Res,
  Headers, // Añadido para recibir el username del cliente
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoursesService, RegisterCompletionData } from './courses.service';
import { Course } from './entities/course.entity';
import * as Express from 'express';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    // SE ELIMINÓ ReportsService de aquí porque no existe y bloquea la App
  ) {}

  // --- NUEVOS MÉTODOS DE PROGRESO (Para que los checks funcionen) ---

  @Post('save-progress')
  async saveProgress(@Body() data: any) {
    return this.coursesService.saveProgress(data);
  }

  @Get('user-progress')
  async getProgress(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.coursesService.getProgress(userId, courseId);
  }

  // --- MÉTODOS EXISTENTES MANTENIDOS ---

  @Get('enrolled/:userId')
  async findCoursesByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.coursesService.findCoursesByUser(userId);
  }

  @Get('users/sucursal/:sucursalId')
  async findUsers(
    @Param('sucursalId') sucursalId: string,
    @Query('q') query: string,
  ) {
    return this.coursesService.findUsersBySucursal(sucursalId, query);
  }

  @Get()
  async findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id/students')
  async getEnrolledStudents(@Param('id') id: string) {
    return this.coursesService.getEnrolledStudents(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    return this.coursesService.uploadFileToBlob(file);
  }

  @Post('register-completion')
  async registerCompletion(@Body() completionData: RegisterCompletionData) {
    return this.coursesService.registerCompletion(completionData);
  }

  @Post(':id/students')
  async assignStudents(
    @Param('id') courseId: string,
    @Body('userIds') userIds: number[],
  ) {
    return this.coursesService.assignUsersToCourse(courseId, userIds);
  }

  @Post()
  async create(@Body() courseData: any) {
    return this.coursesService.create(courseData);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<Course>) {
    return this.coursesService.update(id, updateData);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-user-username') username?: string, // Recibimos el username desde el Front
  ) {
    // CANDADO DE SEGURIDAD: Solo ZAK y MARCO pueden borrar
    const allowedUsers = ['ZAK', 'MARCO'];

    // Convertimos a mayúsculas para evitar errores de escritura
    if (!username || !allowedUsers.includes(username.toUpperCase())) {
      throw new ForbiddenException(
        `El usuario "${username || 'Desconocido'}" no tiene permisos para eliminar cursos.`,
      );
    }

    return this.coursesService.remove(id);
  }

  @Get('reports/stats')
  async getStats() {
    return this.coursesService.getRealReportStats();
  }
}
