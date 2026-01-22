import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CoursesService, RegisterCompletionData } from './courses.service';
import { Course } from './entities/course.entity';

@Controller('v1/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // 1. Subida de archivos usando Memoria (para Vercel y Local)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Esto evita que Multer use el disco duro
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Llama al método que ya tienes en tu servicio
    return this.coursesService.uploadFileToBlob(file);
  }

  // 2. Registro de finalización
  @Post('completion')
  async registerCompletion(@Body() completionData: RegisterCompletionData) {
    return this.coursesService.registerCompletion(completionData);
  }

  // 3. Obtener estudiantes inscritos
  @Get(':id/students')
  async getEnrolledStudents(@Param('id') id: string) {
    return this.coursesService.getEnrolledStudents(id);
  }

  // 4. Asignar estudiantes (el método en tu servicio se llama assignUsersToCourse)
  @Post(':id/assign')
  async assignStudents(
    @Param('id') courseId: string,
    @Body('userIds') userIds: number[],
  ) {
    return this.coursesService.assignUsersToCourse(courseId, userIds);
  }

  // 5. Crear curso
  @Post()
  async create(@Body() courseData: any) {
    return this.coursesService.create(courseData);
  }

  // 6. Eliminar curso
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  // 7. Actualizar curso
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<Course>) {
    return this.coursesService.update(id, updateData);
  }
}

