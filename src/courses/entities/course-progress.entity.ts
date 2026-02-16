import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('course_progress')
export class CourseProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userid' })
  userId: number;

  @Column({ name: 'courseid', type: 'integer' })
  courseId: number;

  // Cambiamos 'json' por 'jsonb' que es el estándar de Postgres/Neon
  @Column({ type: 'jsonb', nullable: true, default: [] })
  viewedVideos: number[];

  @Column({ type: 'jsonb', nullable: true, default: [] })
  viewedPdfs: number[];

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'updatedat' }) // Forzamos minúscula aquí también
  updatedAt: Date;
}
