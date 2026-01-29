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

    // Normalizamos el nombre que viene del front
    const categorias = filters.categorias || [];

    const reportData: any = {
      label,
      sections: {},
    };

    // 1. MATRÍCULAS (Ajustado para asegurar que traiga datos)
    if (categorias.includes('matriculas')) {
      const allUsers = await this.userRepo.find();
      const enrolls = await this.enrollmentRepo.find({ relations: ['course'] });

      if (allUsers.length > 0) {
        reportData.sections['Matrículas'] = allUsers.map((u) => {
          const hasEnroll = enrolls.find(
            (e) => Number(e.userId) === Number(u.id),
          );
          return {
            fecha: 'N/A',
            alumno: u.name,
            curso: hasEnroll?.course?.nombre || 'Sin curso asignado',
            nota: '-',
            estado: hasEnroll ? 'Activo' : 'Sin actividad',
          };
        });
      }
    }

    // 2. CALIFICACIONES
    if (categorias.includes('calificaciones')) {
      const completions = await this.completionRepo.find({
        where: { completedAt: Between(start, end) },
      });
      const users = await this.userRepo.find();
      const courses = await this.courseRepo.find();

      reportData.sections['Calificaciones'] = completions.map((c: any) => {
        const user = users.find((u) => Number(u.id) === Number(c.userId));
        const course = courses.find(
          (co) => Number(co.id) === Number(c.courseId),
        );
        return {
          fecha: new Date(c.completedAt).toLocaleDateString(),
          alumno: user?.name || 'Usuario desconocido',
          curso: course?.nombre || 'Curso no especificado',
          nota: String(c.score),
          estado: 'Completado',
        };
      });
    }

    // 3. LÓGICA DE INSCRIPCIONES (Por defecto si no hay nada o si se marca)
    if (categorias.includes('inscripciones') || categorias.length === 0) {
      const enrolls = await this.enrollmentRepo.find({
        where: { enrolledAt: Between(start, end) },
        relations: ['user', 'course'],
      });

      const mapped = await this.mapEnrollmentsWithData(enrolls);
      reportData.sections['Inscripciones'] = mapped.map((m) => ({
        fecha: new Date(m.enrolledAt || new Date()).toLocaleDateString(),
        alumno: m.studentName,
        curso: m.courseName,
        nota: m.score > 0 ? String(m.score) : 'Pte.',
        estado: m.status,
      }));
    }

    // Validar si hay datos
    if (Object.keys(reportData.sections).length === 0) {
      throw new NotFoundException(
        'No hay datos para las categorías seleccionadas.',
      );
    }

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(reportData, null, 2));
      case 'pdf':
        // Pasamos las secciones por separado para que el PDF las dibuje con títulos
        return await this.generatePdfBuffer(reportData.sections, label);
      case 'csv':
      case 'excel':
      default:
        const flatData = Object.values(reportData.sections).flat();
        return format === 'csv'
          ? await this.generateCsvBuffer(flatData)
          : await this.generateExcelBuffer(flatData);
    }
  }

  private async mapEnrollmentsWithData(enrollments: any[]) {
    const userIds = enrollments
      .map((c) => String(c?.userId))
      .filter((id) => id && id !== 'undefined');
    const courseIds = enrollments
      .map((c) => String(c?.courseId))
      .filter((id) => id && id !== 'undefined');

    const completions = await this.completionRepo
      .find({
        where: { userId: In(userIds), courseId: In(courseIds) },
      })
      .catch(() => []);

    return enrollments.map((enroll) => {
      const completion = completions.find(
        (comp: any) =>
          String(comp?.userId) === String(enroll?.userId) &&
          String(comp?.courseId) === String(enroll?.courseId),
      );

      const nombreAlumno =
        enroll?.user?.name ||
        enroll?.userName ||
        `Estudiante ID: ${enroll?.userId || 'N/A'}`;
      const nombreCurso =
        enroll?.course?.nombre ||
        enroll?.course?.title ||
        'Curso no especificado';

      return {
        ...enroll,
        completedAt: (completion as any)?.completedAt || enroll.enrolledAt,
        studentName: nombreAlumno,
        courseName: nombreCurso,
        score: completion ? Number((completion as any).score) || 0 : 0,
        status: completion ? 'Completado' : 'En progreso',
      };
    });
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

  private async generatePdfBuffer(
    sections: Record<string, any[]>,
    periodLabel: string,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Título Principal Dinámico
    const sectionNames = Object.keys(sections);
    const mainTitle =
      sectionNames.length === 1
        ? `Reporte de ${sectionNames[0]}`
        : 'Reporte Académico Combinado';

    page.drawText(mainTitle, {
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

    let yPosition = height - 100;
    const colX = { fecha: 50, alumno: 130, curso: 300, nota: 480 };

    for (const [sectionTitle, items] of Object.entries(sections)) {
      // Verificar espacio para el título de sección
      if (yPosition < 100) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }

      // Dibujar Título de Sección
      page.drawRectangle({
        x: 45,
        y: yPosition - 5,
        width: width - 90,
        height: 20,
        color: rgb(0.95, 0.95, 0.95),
      });
      page.drawText(sectionTitle.toUpperCase(), {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 25;

      // Encabezados de tabla
      page.drawText('FECHA', {
        x: colX.fecha,
        y: yPosition,
        size: 8,
        font: boldFont,
      });
      page.drawText('ALUMNO', {
        x: colX.alumno,
        y: yPosition,
        size: 8,
        font: boldFont,
      });
      page.drawText('CURSO', {
        x: colX.curso,
        y: yPosition,
        size: 8,
        font: boldFont,
      });
      page.drawText('NOTA', {
        x: colX.nota,
        y: yPosition,
        size: 8,
        font: boldFont,
      });
      yPosition -= 15;

      // Datos
      items.forEach((item) => {
        if (yPosition < 50) {
          page = pdfDoc.addPage();
          yPosition = height - 50;
        }
        page.drawText(String(item.fecha), {
          x: colX.fecha,
          y: yPosition,
          size: 7,
          font,
        });
        page.drawText(String(item.alumno).substring(0, 25), {
          x: colX.alumno,
          y: yPosition,
          size: 7,
          font,
        });
        page.drawText(String(item.curso).substring(0, 30), {
          x: colX.curso,
          y: yPosition,
          size: 7,
          font,
        });
        page.drawText(String(item.nota), {
          x: colX.nota,
          y: yPosition,
          size: 7,
          font,
        });
        yPosition -= 12;
      });
      yPosition -= 20; // Espacio entre secciones
    }

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
