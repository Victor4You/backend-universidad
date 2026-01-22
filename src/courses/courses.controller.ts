// src/courses/courses.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param, // Eliminamos Put si no se usa
  Patch,
  Query,
  Delete,
  UseInterceptors,
  UploadedFile,
  // Eliminamos Req
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import type { RegisterCompletionData } from './courses.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Course } from './entities/course.entity';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findAll() {
    return await this.coursesService.findAll();
  }

  // --- RUTAS ESTÁTICAS O CON PREFIJOS ESPECÍFICOS (DEBEN IR PRIMERO) ---

  @Get('user-progress')
  async getProgress(@Query('userId') userId: string) {
    return await this.coursesService.findProgress(Number(userId));
  }
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return await this.coursesService.uploadFileToBlob(file);
  }
  @Get('my-courses/:userId')
  async getMyCourses(@Param('userId') userId: string) {
    return await this.coursesService.findCoursesByUser(Number(userId));
  }

  @Get('enrolled/:userId')
  async getEnrolledCourses(@Param('userId') userId: string) {
    return await this.coursesService.findCoursesByUser(Number(userId));
  }

  @Get('users/sucursal/:sucursalId')
  async findUsers(
    @Param('sucursalId') sucursalId: string,
    @Query('q') q: string,
  ) {
    return await this.coursesService.findUsersBySucursal(sucursalId, q);
  }

  @Post('register-completion')
  async registerCompletion(@Body() completionData: RegisterCompletionData) {
    return await this.coursesService.registerCompletion(completionData);
  }

  // --- RUTAS CON PARÁMETROS DINÁMICOS :id (DEBEN IR AL FINAL) ---

  @Get(':id/students')
  async getEnrolledStudents(@Param('id') id: string) {
    return this.coursesService.getEnrolledStudents(id);
  }

  @Post(':id/students')
  async assignStudents(
    @Param('id') courseId: string,
    @Body('userIds') userIds: number[],
  ) {
    return await this.coursesService.assignUsersToCourse(courseId, userIds);
  }

  @Post()
  async create(@Body() courseData: any) {
    return await this.coursesService.create(courseData);
  }

  // REEMPLAZA LA SEGUNDA FUNCIÓN 'update' REPETIDA POR ESTA:
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.coursesService.remove(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<Course>) {
    return this.coursesService.update(id, updateData);
  }

  // Endpoint necesario para el modal de estudiantes
  @Patch(':id/assign') // Para gestionar los alumnos desde el modal
  async assignUsers(
    @Param('id') id: string,
    @Body('userIds') userIds: number[],
  ) {
    return this.coursesService.assignUsersToCourse(id, userIds);
  }
}
