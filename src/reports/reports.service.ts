// src/reports/reports.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { CourseCompletion } from '../courses/entities/course-completion.entity';
import { CourseEnrollment } from '../courses/entities/course-enrollment.entity';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/user.entity';
import * as ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(CourseCompletion)
    private completionRepo: Repository<CourseCompletion>,
    @InjectRepository(CourseEnrollment)
    private enrollmentRepo: Repository<CourseEnrollment>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async generateFile(format: string, filters: any): Promise<Buffer> {
    const { start, end, label } = this.calculateDateRange(filters);
    const categorias = filters.categorias || filters.categories || [];
    const reportData: any = { label, sections: {} };

    // --- ESTA ES LA LÍNEA QUE FALTABA ---
    const allUsers = await this.userRepo.find();

    // 1. CALIFICACIONES
    if (categorias.includes('calificaciones')) {
      const completions = await this.completionRepo.find({
        where: { completedAt: Between(start, end) },
      });

      reportData.sections['Calificaciones'] = completions.map((c) => {
        const user = allUsers.find((u) => Number(u.id) === Number(c.userId));
        return {
          USUARIO: user?.name || `ID: ${c.userId}`,
          PROMEDIO: c.score !== null ? `${c.score}` : '0',
        };
      });
    }

    // 2. ASISTENCIAS
    if (categorias.includes('asistencias')) {
      const completions = await this.completionRepo.find({
        where: { completedAt: Between(start, end) },
      });

      reportData.sections['Asistencias'] = completions.map((c) => {
        const user = allUsers.find((u) => Number(u.id) === Number(c.userId));
        return {
          ALUMNO: user?.name || `ID: ${c.userId}`,
          FECHA: new Date(c.completedAt).toLocaleDateString('es-MX'),
        };
      });
    }

    // 3. INSCRIPCIONES (Este ya funcionaba)
    if (categorias.includes('inscripciones')) {
      const enrolls = await this.enrollmentRepo.find({
        where: { enrolledAt: Between(start, end) },
        relations: ['course', 'user'],
      });
      reportData.sections['Inscripciones'] = enrolls.map((e) => ({
        ALUMNO: e.user?.name || e.userName || `ID: ${e.userId}`,
        CURSOS: e.course?.nombre || 'Curso',
      }));
    }

    if (Object.keys(reportData.sections).length === 0) {
      throw new NotFoundException(
        'No se encontraron registros en el rango de fechas seleccionado.',
      );
    }

    return format === 'pdf'
      ? await this.generatePdfBuffer(reportData.sections, label)
      : await this.generateExcelBuffer(reportData.sections);
  }

  private async generatePdfBuffer(
    sections: Record<string, any[]>,
    periodLabel: string,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    page.drawText(`REPORTE ACADÉMICO - ${periodLabel}`, {
      x: 50,
      y,
      size: 16,
      font: boldFont,
    });
    y -= 40;

    for (const [title, items] of Object.entries(sections)) {
      if (y < 120) {
        page = pdfDoc.addPage();
        y = height - 50;
      }

      // Encabezado azul de sección
      page.drawRectangle({
        x: 50,
        y: y - 5,
        width: width - 100,
        height: 18,
        color: rgb(0.1, 0.4, 0.7),
      });
      page.drawText(title.toUpperCase(), {
        x: 55,
        y,
        size: 10,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      y -= 25;

      if (items.length > 0) {
        const headers = Object.keys(items[0]);
        // Headers de tabla
        headers.forEach((h, i) => {
          page.drawText(h, { x: 50 + i * 250, y, size: 9, font: boldFont });
        });
        y -= 15;

        // Filas de datos
        items.forEach((item) => {
          if (y < 50) {
            page = pdfDoc.addPage();
            y = height - 50;
          }
          headers.forEach((h, i) => {
            page.drawText(String(item[h]).substring(0, 50), {
              x: 50 + i * 250,
              y,
              size: 8,
              font,
            });
          });
          y -= 12;
        });
      }
      y -= 30;
    }
    return Buffer.from(await pdfDoc.save());
  }

  private async generateExcelBuffer(
    sections: Record<string, any[]>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    for (const [title, items] of Object.entries(sections)) {
      const sheet = workbook.addWorksheet(title);
      if (items.length > 0) {
        const headers = Object.keys(items[0]);
        sheet.columns = headers.map((h) => ({ header: h, key: h, width: 35 }));
        sheet.addRows(items);
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      }
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private calculateDateRange(filters: any) {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start = new Date();
    const range = filters?.range || filters?.period || 'mes';

    if (range === 'hoy') start.setHours(0, 0, 0, 0);
    else if (range === 'semana') start.setDate(now.getDate() - 7);
    else if (range === 'anio') start.setFullYear(now.getFullYear() - 1);
    else start.setDate(now.getDate() - 30);

    const labels: Record<string, string> = {
      hoy: 'Hoy',
      semana: 'Última Semana',
      mes: 'Último Mes',
      anio: 'Último Año',
    };
    return { start, end, label: labels[range] || 'Último Mes' };
  }

  private async generateCsvBuffer(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.columns = headers.map((h) => ({
        header: h.toUpperCase(),
        key: h,
      }));
      data.forEach((item) => worksheet.addRow(item));
    }
    return Buffer.from(await workbook.csv.writeBuffer());
  }

  private applyWorksheetSchema(worksheet: ExcelJS.Worksheet, data: any[]) {
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Alumno', key: 'alumno', width: 25 },
      { header: 'Curso', key: 'curso', width: 35 },
      { header: 'Nota', key: 'nota', width: 12 }, // Cambiado a 'nota' para que coincida con la data
      { header: 'Estado', key: 'estado', width: 15 },
    ];
    data.forEach((item) => worksheet.addRow(item));
  }

  async getAcademicStats() {
    try {
      const completions = await this.completionRepo.find();
      const enrollments = await this.enrollmentRepo.find();
      const courses = await this.courseRepo.find();

      const totalCalificaciones = completions.length;
      const totalInscripciones = enrollments.length;

      const rangos = [
        { rango: '0-59', min: 0, max: 59, color: '#EF4444', cantidad: 0 },
        { rango: '60-75', min: 60, max: 75, color: '#F59E0B', cantidad: 0 },
        { rango: '76-85', min: 76, max: 85, color: '#10B981', cantidad: 0 },
        { rango: '86-95', min: 86, max: 95, color: '#3B82F6', cantidad: 0 },
        { rango: '96-100', min: 96, max: 100, color: '#8B5CF6', cantidad: 0 },
      ];

      completions.forEach((c) => {
        const score = Number(c.score);
        const rango = rangos.find((r) => score >= r.min && score <= r.max);
        if (rango) rango.cantidad++;
      });

      const distribucion = rangos.map((r) => ({
        ...r,
        porcentaje:
          totalCalificaciones > 0
            ? Math.round((r.cantidad / totalCalificaciones) * 100)
            : 0,
      }));

      const cursosMap = new Map();
      completions.forEach((c) => {
        const cursoObj = courses.find(
          (co) => Number(co.id) === Number(c.courseId),
        );
        const nombre = cursoObj?.nombre || 'Curso Desconocido';
        if (!cursosMap.has(nombre)) {
          cursosMap.set(nombre, { suma: 0, count: 0, aprobados: 0 });
        }
        const stats = cursosMap.get(nombre);
        stats.suma += Number(c.score);
        stats.count++;
        if (Number(c.score) >= 60) stats.aprobados++;
      });

      const rendimiento = Array.from(cursosMap.entries())
        .map(([curso, s]) => ({
          curso,
          promedio: Math.round(s.suma / s.count),
          aprobados: s.aprobados,
          reprobados: s.count - s.aprobados,
        }))
        .slice(0, 5);

      return {
        totalInscripciones,
        totalCalificaciones,
        distribucion,
        rendimiento,
      };
    } catch (error) {
      throw new Error('Error al procesar estadísticas académicas');
    }
  }
}
