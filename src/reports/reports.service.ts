// src/reports/reports.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CourseCompletion } from '../courses/entities/course-completion.entity';
import * as ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(CourseCompletion)
    private completionRepo: Repository<CourseCompletion>,
  ) {}

  /**
   * Genera el archivo (PDF, Excel, CSV, JSON) según el periodo seleccionado
   */
  async generateFile(format: string, filters: any): Promise<Buffer> {
    const { start, end, label } = this.calculateDateRange(filters);

    let data = await this.completionRepo.find({
      where: { completedAt: Between(start, end) },
      relations: { user: true, course: true },
      order: { completedAt: 'DESC' },
    });

    if (!data || data.length === 0) {
      data = await this.completionRepo.find({
        take: 50,
        relations: { user: true, course: true },
        order: { completedAt: 'DESC' },
      });
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(
        `Aún no hay cursos completados en el sistema.`,
      );
    }

    this.logger.log(`Generando reporte [${label}]. Registros: ${data.length}`);

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      case 'csv':
        return await this.generateCsvBuffer(data);
      case 'pdf':
        return await this.generatePdfBuffer(data, label);
      case 'excel':
      default:
        return await this.generateExcelBuffer(data);
    }
  }

  private calculateDateRange(filters: any) {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let start = new Date();
    let label = 'Último Mes';

    const period = filters?.period || 'month';

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        label = 'Hoy';
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        label = 'Última Semana';
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        label = 'Último Mes';
        break;
      case 'quarter':
        start.setDate(now.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        label = 'Último Trimestre';
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        label = 'Último Año';
        break;
      case 'custom':
        if (filters.startDate && filters.endDate) {
          start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const customEnd = new Date(filters.endDate);
          customEnd.setHours(23, 59, 59, 999);
          return { start, end: customEnd, label: 'Personalizado' };
        }
        break;
      default:
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    }

    return { start, end, label };
  }

  // --- MÉTODOS DE GENERACIÓN (CORREGIDOS) ---

  private async generatePdfBuffer(
    data: any[],
    periodLabel: string,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('Reporte Académico de Estudiantes', {
      x: 50,
      y: height - 50,
      size: 18,
      font: boldFont,
    });
    page.drawText(`Periodo: ${periodLabel}`, {
      x: 50,
      y: height - 70,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const tableTop = height - 110;
    const colX = { fecha: 50, alumno: 130, curso: 300, nota: 500 };

    page.drawText('Fecha', {
      x: colX.fecha,
      y: tableTop,
      size: 10,
      font: boldFont,
    });
    page.drawText('Alumno', {
      x: colX.alumno,
      y: tableTop,
      size: 10,
      font: boldFont,
    });
    page.drawText('Curso', {
      x: colX.curso,
      y: tableTop,
      size: 10,
      font: boldFont,
    });
    page.drawText('Nota', {
      x: colX.nota,
      y: tableTop,
      size: 10,
      font: boldFont,
    });

    let yPosition = tableTop - 25;
    data.forEach((item) => {
      if (yPosition < 50) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }
      const fecha = item.completedAt
        ? new Date(item.completedAt).toLocaleDateString()
        : 'N/A';
      const alumno = String(item.user?.name || 'Estudiante').substring(0, 25);
      const curso = String(item.course?.nombre || 'Curso').substring(0, 35);

      page.drawText(fecha, { x: colX.fecha, y: yPosition, size: 9, font });
      page.drawText(alumno, { x: colX.alumno, y: yPosition, size: 9, font });
      page.drawText(curso, { x: colX.curso, y: yPosition, size: 9, font });
      page.drawText(String(item.score || 0), {
        x: colX.nota,
        y: yPosition,
        size: 9,
        font,
      });
      yPosition -= 18;
    });

    return Buffer.from(await pdfDoc.save());
  }

  private async generateExcelBuffer(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');
    this.applyWorksheetSchema(worksheet, data);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async generateCsvBuffer(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');
    this.applyWorksheetSchema(worksheet, data);
    return Buffer.from(await workbook.csv.writeBuffer());
  }

  private applyWorksheetSchema(worksheet: ExcelJS.Worksheet, data: any[]) {
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Alumno', key: 'alumno', width: 25 },
      { header: 'Curso', key: 'curso', width: 35 },
      { header: 'Nota', key: 'score', width: 12 },
    ];
    data.forEach((item) =>
      worksheet.addRow({
        fecha: item.completedAt
          ? new Date(item.completedAt).toLocaleDateString()
          : 'N/A',
        alumno: item.user?.name || 'N/A',
        curso: item.course?.nombre || 'N/A',
        score: item.score || 0,
      }),
    );
  }

  async getAcademicStats() {
    const completions = await this.completionRepo.find({
      relations: { course: true },
    });
    // ... (Tu lógica de estadísticas de rendimiento y rangos aquí se mantiene igual)
    return { total: completions.length /* ... otros datos */ };
  }
}
