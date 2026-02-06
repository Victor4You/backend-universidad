import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { User } from '../users/user.entity';
import { AuthModule } from '../auth/auth.module'; // <--- IMPORTAR ESTO

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, User]),
    AuthModule, // <--- 1. AGREGAR ESTO AQUÍ
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
