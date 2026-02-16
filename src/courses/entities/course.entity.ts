import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { CourseEnrollment } from './course-enrollment.entity';
import { CourseSection } from './course-section.entity';
import { CreateDateColumn } from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigo: string;

  @Column()
  nombre: string;

  @Column()
  profesor: string;

  @Column({ default: 0 })
  creditos: number;

  @Column({ type: 'timestamp', nullable: true })
  fechaLimite: Date;

  @Column({ default: '2024-I' })
  semestre: string;

  @Column({ default: 'activo' })
  estado: string;

  @Column({ default: 'general' })
  tipo: string;

  @Column({ type: 'jsonb', nullable: true })
  videos: any[];

  @Column({ type: 'jsonb', nullable: true })
  pdfs: any[];

  @Column({ type: 'jsonb', nullable: true })
  questions: any[];

  @Column({ default: 30 })
  duracionExamen: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => CourseEnrollment, (enrollment) => enrollment.course)
  estudiantesInscritos: CourseEnrollment[];

  @Column({ type: 'jsonb', nullable: true, default: [] })
  secciones: any[];
}
