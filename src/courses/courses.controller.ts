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
import * as Express from 'express';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly reportsService: ReportsService,
  ) {}

  // CAMBIO CLAVE: Usamos @Post porque tus logs muestran que el Front envía un POST
  // Mantenemos la lógica de filtros y el buffer intactos.
  @Post('export')
  async export(@Res() res: Express.Response, @Body() filters: any) {
    try {
      const format = filters.format || 'excel';
      const buffer = await this.reportsService.generateFile(format, filters);

      const contentTypes: Record<string, string> = {
        pdf: 'application/pdf',
        excel:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
      };

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

  // ... (Tus otras rutas se mantienen exactamente igual)
  @Get('enrolled/:userId')
  async findCoursesByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.coursesService.findCoursesByUser(userId);
  }

  @Get('user-progress')
  async findProgress(@Query('userId', ParseIntPipe) userId: number) {
    return this.coursesService.findProgress(userId);
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
  async remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

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
