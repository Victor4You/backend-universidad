// src/courses/courses.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Body,
  Param,
  Patch,
  Query,
  Delete,
} from '@nestjs/common';
import { CoursesService, RegisterCompletionData } from './courses.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer'; // <-- Esto lo hace universal
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Funciona igual en Local y Vercel
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Al usar memoryStorage, el archivo llega aquí como file.buffer
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
