// src/courses/courses.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import type { RegisterCompletionData } from './courses.service';

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

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: any) {
    return await this.coursesService.update(id, updateData);
  }

  // REEMPLAZA LA SEGUNDA FUNCIÓN 'update' REPETIDA POR ESTA:
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.coursesService.remove(id);
  }
}
