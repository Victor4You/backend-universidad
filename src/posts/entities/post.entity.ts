import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Comment } from './comment.entity'; // Asegúrate de que el nombre del archivo sea exacto

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  mediaUrl?: string;

  @Column({ nullable: true })
  mediaType?: 'image' | 'file';

  @Column({ nullable: true })
  mediaName?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column('int', { default: 0 })
  likesCount: number;

  @Column('text', { array: true, default: '{}' })
  likedBy: string[];

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @OneToMany(() => Comment, (comment: Comment) => comment.post) // Tipado explícito
  comments: Comment[];
}
