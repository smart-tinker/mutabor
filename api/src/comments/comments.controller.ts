import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto'; // --- ИСПРАВЛЕНИЕ #6 (путь) ---
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser as CurrentUser } from '../auth/decorators/get-user.decorator';
import { UserRecord as User } from '../types/db-records';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('tasks/:taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.createComment(taskId, createCommentDto, user.id);
  }

  @Get('tasks/:taskId/comments')
  async getCommentsForTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.commentsService.getCommentsForTask(taskId);
  }
}