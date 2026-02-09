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
      const posts = await this.postRepo.find({
        relations: ['user', 'comments', 'comments.user'],
        order: { timestamp: 'DESC' },
      });
      return posts.map((post) => this.formatPost(post, currentUserId));
    } catch (error) {
      this.logger.error(`Error buscando posts: ${error.message}`);
      return [];
    }
  }

  private formatPost(post: Post, currentUserId?: string) {
    return {
      id: post.id.toString(),
      content: post.content || '',
      timestamp: post.timestamp
        ? post.timestamp.toISOString()
        : new Date().toISOString(),
      likes: Number(post.likesCount) || 0,
      liked:
        post.likedBy && currentUserId
          ? post.likedBy.includes(currentUserId.toString())
          : false,
      shares: Number(post.sharesCount) || 0,
      isPoll: !!post.isPoll,
      pollData: post.isPoll
        ? { question: post.pollQuestion, options: post.pollOptions }
        : null,
      user: {
        // Si post.user es null (puede pasar en Neon si la relación falla), evitamos el crash
        id: post.user?.id?.toString() || '0',
        name: post.user?.name || 'Usuario del Sistema',
        role: post.user?.role || 'user',
        avatar: post.user?.avatar || null,
      },
      media: post.mediaUrl
        ? { type: post.mediaType, url: post.mediaUrl, name: post.mediaName }
        : null,
      comments: post.comments || [],
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
