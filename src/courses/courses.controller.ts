// src/courses/courses.controller.ts
import { Controller, Get, Post, Body, Put, Param, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // 1. OBTENER TODOS LOS CURSOS (Para todos los roles)
  @Get()
  async findAll() {
    return await this.coursesService.findAll();
  }
  @Post('register-completion') // <--- ESTA ES LA RUTA QUE FALTABA
  async registerCompletion(@Body() completionData: any) {
    return await this.coursesService.registerCompletion(completionData);
  }

  // 2. OBTENER PROGRESO DEL ESTUDIANTE
  @Get('user-progress')
  async getProgress(@Query('userId') userId: string) {
    return await this.coursesService.findProgress(Number(userId));
  }

  // 3. CREAR NUEVO CURSO (Desde el botón "Nuevo Curso")
  @Post()
  async create(@Body() courseData: any) {
    return await this.coursesService.create(courseData);
  }

  // 4. ACTUALIZAR CURSO
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: any) {
    return await this.coursesService.update(id, updateData);
  }
}
