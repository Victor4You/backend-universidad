import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { User } from '../users/user.entity';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(
    content: string,
    userId: string,
    file?: Express.Multer.File,
    pollData?: any,
  ) {
    try {
      const user = await this.userRepo.findOneBy({ id: Number(userId) as any });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      const postData: Partial<Post> = {
        content: content || '',
        user: user,
        likesCount: 0,
        likedBy: [],
        timestamp: new Date(),
        isPoll: !!pollData,
        pollQuestion: pollData?.question || null,
        pollOptions: pollData?.options
          ? pollData.options.map((opt: string) => ({
              option: opt,
              votes: 0,
              vitedBy: [],
            }))
          : [],
      };

      if (file) {
        const base64Data = file.buffer.toString('base64');
        postData.mediaUrl = `data:${file.mimetype};base64,${base64Data}`;
        postData.mediaName = file.originalname;
        postData.mediaType = file.mimetype.startsWith('image/')
          ? 'image'
          : 'file';
      }

      const newPost = this.postRepo.create(postData);
      const savedPost = await this.postRepo.save(newPost);
      return this.formatPost(savedPost);
    } catch (error) {
      this.logger.error(`Error creando post: ${error.message}`);
      throw error;
    }
  }

  // ÚNICA IMPLEMENTACIÓN DE findAll
  async findAll(currentUserId?: string) {
    try {
      // Agregamos un log para debuggear en Vercel
      this.logger.log(`Buscando posts para el usuario: ${currentUserId}`);

      const posts = await this.postRepo.find({
        // Aseguramos que las relaciones se carguen explícitamente
        relations: {
          user: true,
          comments: {
            user: true,
          },
        },
        order: { timestamp: 'DESC' },
        // En Vercel es mejor limitar un poco si tienes muchos posts para evitar timeouts
        take: 50,
      });

      if (!posts) return [];

      return posts.map((post) => this.formatPost(post, currentUserId));
    } catch (error) {
      this.logger.error(`Error buscando posts en Neon: ${error.message}`);
      // IMPORTANTE: No devuelvas [] si es un error de conexión,
      // lanza el error para que el frontend sepa que debe reintentar
      throw new Error(
        `Error de conexión con la base de datos: ${error.message}`,
      );
    }
  }

  private formatPost(post: Post, currentUserId?: string) {
    // Aseguramos que likedBy sea siempre un array para evitar fallos en .includes
    const likedByArray = Array.isArray(post.likedBy) ? post.likedBy : [];
    const uId = currentUserId?.toString();

    return {
      id: post.id.toString(),
      content: post.content || '',
      timestamp:
        post.timestamp instanceof Date
          ? post.timestamp.toISOString()
          : new Date(post.timestamp).toISOString(),
      likes: Number(post.likesCount) || 0,
      liked: uId ? likedByArray.includes(uId) : false,
      shares: Number(post.sharesCount) || 0,
      isPoll: !!post.isPoll,
      pollData: post.isPoll
        ? {
            question: post.pollQuestion,
            options: Array.isArray(post.pollOptions) ? post.pollOptions : [],
          }
        : null,
      user: {
        id: post.user?.id?.toString() || '0',
        name: post.user?.name || 'Usuario del Sistema',
        role: post.user?.role || 'estudiante',
        avatar: post.user?.avatar || null,
      },
      media: post.mediaUrl
        ? { type: post.mediaType, url: post.mediaUrl, name: post.mediaName }
        : null,
      comments: Array.isArray(post.comments)
        ? post.comments.map((c) => ({
            ...c,
            id: c.id.toString(),
            user: {
              id: c.user?.id?.toString() || '0',
              name: c.user?.name || 'Usuario',
              avatar: c.user?.avatar || null,
            },
          }))
        : [],
    };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post no encontrado');

    if (!post.likedBy) post.likedBy = [];
    const uId = userId.toString();
    const index = post.likedBy.indexOf(uId);

    if (index === -1) {
      post.likedBy.push(uId);
      post.likesCount = (post.likesCount || 0) + 1;
    } else {
      post.likedBy.splice(index, 1);
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    }

    const saved = await this.postRepo.save(post);
    return this.formatPost(saved, uId);
  }

  async addComment(postId: string, userId: string, content: string) {
    const post = await this.postRepo.findOneBy({ id: postId });
    const user = await this.userRepo.findOneBy({ id: Number(userId) as any });

    if (!post || !user)
      throw new NotFoundException('Post o Usuario no encontrado');

    const comment = this.commentRepo.create({
      content,
      post,
      user,
      timestamp: new Date(),
    });

    await this.commentRepo.save(comment);
    return this.findAll(userId); // Pasamos el userId para mantener consistencia
  }

  async toggleShare(postId: string) {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post no encontrado');
    post.sharesCount = (post.sharesCount || 0) + 1;
    const saved = await this.postRepo.save(post);
    return this.formatPost(saved);
  }

  async votePoll(postId: string, optionIndex: number, userId: string) {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post || !post.isPoll)
      throw new NotFoundException('Encuesta no encontrada');

    if (!post.pollOptions[optionIndex].vitedBy)
      post.pollOptions[optionIndex].vitedBy = [];

    const alreadyVoted = post.pollOptions.some((opt) =>
      opt.vitedBy?.includes(userId),
    );
    if (alreadyVoted) return this.formatPost(post, userId);

    post.pollOptions[optionIndex].votes += 1;
    post.pollOptions[optionIndex].vitedBy.push(userId);

    const saved = await this.postRepo.save(post);
    return this.formatPost(saved, userId);
  }
}
