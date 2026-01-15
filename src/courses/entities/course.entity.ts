import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

  @Column({ default: '2024-I' })
  semestre: string;

  @Column({ default: 'activo' })
  estado: string;

  // Guardamos el contenido como JSON para no complicar la DB
  @Column({ type: 'jsonb', nullable: true })
  videos: any[];

  @Column({ type: 'jsonb', nullable: true })
  pdfs: any[];

  @Column({ type: 'jsonb', nullable: true })
  questions: any[];

  @Column({ default: 30 })
  duracionExamen: number;
}
