// src/reports/reports.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';

// Definimos una interfaz para evitar el uso de 'any' y corregir los errores de ESLint
interface ExportReportDto {
  format: string;
  range?: string;
  includeCharts?: boolean;
  includeDetails?: boolean;
  dataTypes?: string[];
  categorias?: string[];
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('export')
  async exportReport(@Body() exportDto: ExportReportDto, @Res() res: Response) {
    try {
      const { format } = exportDto;
      const buffer = await this.reportsService.generateFile(format, exportDto);
      const filename = `Reporte_Academico_${Date.now()}`;

      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        excel:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        json: 'application/json',
      };

      const extensions: Record<string, string> = {
        pdf: 'pdf',
        excel: 'xlsx',
        csv: 'csv',
        json: 'json',
      };

      const contentType = mimeTypes[format] || mimeTypes.excel;
      const extension = extensions[format] || 'xlsx';

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}.${extension}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      return res.send(buffer);
    } catch (error: unknown) {
      // Manejo dinámico de excepciones de NestJS
      if (error instanceof HttpException) {
        return res.status(error.getStatus()).json(error.getResponse());
      }

      // Tipamos el error para acceder de forma segura a .message
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error interno al generar el archivo';

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: errorMessage,
      });
    }
  }

  @Get('stats')
  async getStats() {
    return this.reportsService.getAcademicStats();
  }
}
