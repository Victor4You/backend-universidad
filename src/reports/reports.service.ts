// src/reports/reports.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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

    // 1. CARGA DE DATOS MAESTROS
    const rawUsers = await this.userRepo.find();

    // UNIFICACIÓN DE ALUMNOS MEJORADA:
    // Solo filtramos si el nombre es EXACTAMENTE igual y no es nulo.
    // Si no tienen nombre, usamos el ID para que no se eliminen entre sí.
    const allUsers = rawUsers.filter(
      (user, index, self) =>
        index ===
        self.findIndex(
          (u) =>
            (u.name &&
              u.name.trim().toUpperCase() ===
                user.name?.trim().toUpperCase()) ||
            u.id === user.id,
        ),
    );

    const allCourses = await this.courseRepo.find();
    const allEnrollments = await this.enrollmentRepo.find({
      relations: ['course'],
    });

    // 2. MATRÍCULAS (Garantizamos que aparezcan TODOS los alumnos del sistema)
    if (categorias.includes('matriculas')) {
      reportData.sections['Matrículas'] = allUsers.map((user) => {
        // Búsqueda de inscripciones (por ID o por Nombre para el caso 9742)
        const userEnrollments = allEnrollments.filter((e) => {
          const matchId = String(e.userId).trim() === String(user.id).trim();
          const matchNombre =
            user.name &&
            e.userName?.trim().toUpperCase() === user.name.trim().toUpperCase();
          return matchId || matchNombre;
        });

        const isInscribed = userEnrollments.length > 0;

        // Nombres de cursos únicos
        const nombresCursos = isInscribed
          ? Array.from(
              new Set(userEnrollments.map((e) => e.course?.nombre || 'Curso')),
            ).join(', ')
          : 'N/A';

        return {
          ALUMNO: user.name || user.username || `Usuario ID: ${user.id}`,
          ESTADO: isInscribed ? 'Inscrito' : 'No inscrito',
          CURSOS: nombresCursos,
        };
      });
    }

    // 3. EVALUACIONES (Mantenemos la lógica que ya te funcionó)
    if (categorias.includes('evaluaciones')) {
      const completions = await this.completionRepo.find({
        where: { completedAt: Between(start, end) },
      });
      const allEnrollments = await this.enrollmentRepo.find();

      reportData.sections['Evaluaciones'] = completions.map((c) => {
        let userMatch = allUsers.find(
          (u) => String(u.id).trim() === String(c.userId).trim(),
        );
        let nombreFinal = userMatch?.name;

        if (!nombreFinal) {
          const backup = allEnrollments.find(
            (e) => String(e.userId).trim() === String(c.userId).trim(),
          );
          nombreFinal = backup?.userName || `ID: ${c.userId}`;
        }

        const courseMatch = allCourses.find(
          (co) => String(co.id).trim() === String(c.courseId).trim(),
        );

        return {
          ALUMNO: nombreFinal,
          CURSO: courseMatch?.nombre || 'Curso terminado',
          CALIFICACION: c.score !== null ? `${c.score}` : '0',
        };
      });
    }

    // --- REPETIR ESTA LÓGICA DE BÚSQUEDA PARA CALIFICACIONES Y ASISTENCIAS ---
    if (categorias.includes('calificaciones')) {
      const completions = await this.completionRepo.find({
        where: { completedAt: Between(start, end) },
      });
      const allEnrollments = await this.enrollmentRepo.find();
      reportData.sections['Calificaciones'] = completions.map((c) => {
        const u = allUsers.find(
          (u) => String(u.id).trim() === String(c.userId).trim(),
        );
        const e = allEnrollments.find(
          (e) => String(e.userId).trim() === String(c.userId).trim(),
        );
        return {
          ALUMNO: u?.name || e?.userName || `ID: ${c.userId}`,
          PROMEDIO: c.score !== null ? `${c.score}` : '0',
        };
      });
    }

    if (Object.keys(reportData.sections).length === 0) {
      throw new NotFoundException('No se encontraron registros.');
    }

    return format === 'pdf'
      ? await this.generatePdfBuffer(reportData.sections, label)
      : await this.generateExcelBuffer(reportData.sections);
  }

  // --- LOS DEMÁS MÉTODOS PRIVADOS (generatePdfBuffer, generateExcelBuffer, etc.)
  // SE MANTIENEN EXACTAMENTE IGUAL A TU LÓGICA Y DISEÑO ORIGINAL ---

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
        headers.forEach((h, i) => {
          page.drawText(h, { x: 50 + i * 180, y, size: 9, font: boldFont });
        });
        y -= 15;
        items.forEach((item) => {
          if (y < 50) {
            page = pdfDoc.addPage();
            y = height - 50;
          }
          headers.forEach((h, i) => {
            page.drawText(String(item[h]).substring(0, 40), {
              x: 50 + i * 180,
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

  async getAcademicStats() {
    // Se mantiene igual tu lógica de estadísticas...
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
