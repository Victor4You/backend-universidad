import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

    let rawData: CourseEnrollment[];

    try {
      // Cargamos las relaciones para asegurar que el objeto 'user' y 'course' existan
      rawData = await this.enrollmentRepo.find({
        relations: ['user', 'course'], // Cruce directo con la tabla users
        order: { id: 'DESC' } as any,
      });
    } catch (error) {
      rawData = await this.enrollmentRepo.find({
        relations: ['user', 'course'],
      });
    }

    const filteredData = rawData.filter((item) => {
      if (!(item as any).createdAt && !(item as any).enrolledAt) return true;
      const itemDate = new Date(
        (item as any).createdAt || (item as any).enrolledAt,
      );
      return itemDate >= start && itemDate <= end;
    });

    const finalData =
      filteredData.length > 0 ? filteredData : rawData.slice(0, 50);

    if (!finalData || finalData.length === 0) {
      throw new NotFoundException(
        `No se encontraron inscripciones en el sistema.`,
      );
    }

    const data = await this.mapEnrollmentsWithData(finalData);

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

  private async mapEnrollmentsWithData(enrollments: any[]) {
    // 1. Limpieza de IDs para evitar que In([]) falle o explote
    const userIds = enrollments
      .map((c) => String(c?.userId))
      .filter((id) => id && id !== 'undefined');
    const courseIds = enrollments
      .map((c) => String(c?.courseId))
      .filter((id) => id && id !== 'undefined');

    const completions = await this.completionRepo
      .find({
        where: {
          userId: In(userIds),
          courseId: In(courseIds),
        },
      })
      .catch(() => []);

    return enrollments.map((enroll) => {
      // CAMBIO AQUÍ: Añadimos (comp: any) para evitar el error de tipo 'never'
      const completion = completions.find(
        (comp: any) =>
          String(comp?.userId) === String(enroll?.userId) &&
          String(comp?.courseId) === String(enroll?.courseId),
      );

      const fechaReferencia =
        (enroll as any)?.createdAt || (enroll as any)?.enrolledAt || new Date();

      // PROTECCIÓN TOTAL PARA VERCEL
      const nombreAlumno =
        enroll?.user?.name ||
        enroll?.userName ||
        enroll?.userUsername ||
        `Estudiante ID: ${enroll?.userId || 'N/A'}`;

      const nombreCurso =
        enroll?.course?.nombre ||
        enroll?.course?.title ||
        'Curso no especificado';

      return {
        ...enroll,
        completedAt: completion?.completedAt || fechaReferencia,
        studentName: nombreAlumno,
        courseName: nombreCurso,
        score: completion ? Number(completion.score) || 0 : 0,
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
    data: any[],
    periodLabel: string,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('Reporte Académico General', {
      x: 50,
      y: height - 50,
      size: 18,
      font: boldFont,
    });
    page.drawText(`Periodo: ${periodLabel} (Incluye alumnos en curso)`, {
      x: 50,
      y: height - 70,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const colX = { fecha: 50, alumno: 130, curso: 300, nota: 500 };
    let yPosition = height - 135;

    data.forEach((item) => {
      if (yPosition < 50) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }
      const fecha = item.completedAt
        ? new Date(item.completedAt).toLocaleDateString()
        : 'N/A';
      const alumno = String(item.studentName).substring(0, 30);
      const curso = String(item.courseName).substring(0, 35);
      const nota = item.score > 0 ? String(item.score) : 'Pte.';

      page.drawText(fecha, { x: colX.fecha, y: yPosition, size: 9, font });
      page.drawText(alumno, { x: colX.alumno, y: yPosition, size: 9, font });
      page.drawText(curso, { x: colX.curso, y: yPosition, size: 9, font });
      page.drawText(nota, { x: colX.nota, y: yPosition, size: 9, font });
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
      { header: 'Estado', key: 'status', width: 15 },
    ];
    data.forEach((item) =>
      worksheet.addRow({
        fecha: item.completedAt
          ? new Date(item.completedAt).toLocaleDateString()
          : 'N/A',
        alumno: item.studentName || 'N/A',
        curso: item.courseName || 'N/A',
        score: item.score || 0,
        status: item.status,
      }),
    );
  }

  async getAcademicStats() {
    // ... (Tu código de estadísticas se mantiene sin cambios)
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
