import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post('register-attempt')
  async registerAttempt(
    @Body() body: { userId: number; courseId: string; score: number },
  ) {
    return await this.coursesService.registerAttempt(body);
  }

  @Post('register-completion')
  async register(
    @Body()
    body: {
      userId: number;
      courseId: string;
      score: number;
      survey: any;
    },
  ) {
    return await this.coursesService.registerCompletion(body);
  }

  @Get('user-progress')
  async getProgress(@Query('userId') userId: string) {
    return await this.coursesService.getUserProgress(Number(userId));
  }
}
