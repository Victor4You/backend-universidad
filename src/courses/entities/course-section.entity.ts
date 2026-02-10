import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Course } from './course.entity';

@Entity('course_sections')
export class CourseSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  titulo: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ type: 'jsonb', default: [] })
  videos: any[];

  @Column({ type: 'jsonb', default: [] })
  pdfs: any[];

  @Column({ type: 'jsonb', nullable: true })
  examen: {
    preguntas: any[];
    tiempoLimite: number;
  };

  @ManyToOne(() => Course, (course) => course.secciones, {
    onDelete: 'CASCADE',
  })
  course: Course;
}
