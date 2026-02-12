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

  @Column()
  userId: number;

  @Column() // Cambiado de string a number para coincidir con el controlador
  courseId: number;

  @Column({ type: 'json', nullable: true, default: [] })
  viewedVideos: number[];

  @Column({ type: 'json', nullable: true, default: [] })
  viewedPdfs: number[];

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  updatedAt: Date;
}
