import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('course_progress')
export class CourseProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userid' })
  userId: number;

  @Column({ name: 'courseid' })
  courseId: number;

  // Forzamos el nombre físico a minúsculas para evitar errores de CamelCase en Neon
  @Column({ name: 'viewedvideos', type: 'jsonb', nullable: true, default: [] })
  viewedVideos: number[];

  @Column({ name: 'viewedpdfs', type: 'jsonb', nullable: true, default: [] })
  viewedPdfs: number[];

  @Column({ name: 'attempts', default: 0 })
  attempts: number;

  @Column({ name: 'seccionid', nullable: true })
  seccionId: string;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}