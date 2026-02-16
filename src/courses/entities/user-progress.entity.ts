import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  courseId: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  fechaCertificacion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaVencimiento: Date;

  @Column({ type: 'float', default: 0 })
  calidadInstructor: number;

  @Column({ type: 'float', default: 0 })
  utilidadContenido: number;

  // NUEVAS COLUMNAS PARA EL PROGRESO
  @Column({ nullable: true })
  seccionId: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  videosVistos: any[];

  @Column({ type: 'jsonb', nullable: true, default: [] })
  pdfsLeidos: any[];
}
