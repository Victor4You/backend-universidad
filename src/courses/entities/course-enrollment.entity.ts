import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne, // Añadir esto
  JoinColumn, // Añadir esto
} from 'typeorm';
import { Course } from './course.entity'; // Asegúrate de importar tu entidad Course

@Entity('course_enrollments')
export class CourseEnrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  courseId: string;

  // Definimos la relación con el curso
  @ManyToOne(() => Course, (course) => course.estudiantesInscritos) // Cambiado de .enrollments a .estudiantesInscritos
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  userId: number;

  @CreateDateColumn()
  enrolledAt: Date;
}
