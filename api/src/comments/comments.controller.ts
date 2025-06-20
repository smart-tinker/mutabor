import { Controller, Post, Body, Get, Param, UseGuards, Req, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser as CurrentUser } from '../auth/decorators/get-user.decorator'; // Assuming you have a @User decorator
import { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller() // No prefix for the controller itself, paths defined in methods
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('tasks/:taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User, // Use the decorator to get the authenticated user
  ) {
    return this.commentsService.createComment(taskId, createCommentDto, user.id);
  }

  @Get('tasks/:taskId/comments')
  async getCommentsForTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    // @CurrentUser() user: User, // User might be needed if there's a permission check here
                                  // but currently CommentsService.getCommentsForTask doesn't require user
  ) {
    // Add permission checks here if necessary, e.g., ensuring user is part of the project
    // For now, deferring to potential service-level checks or assuming public access once task ID is known
    // and user is authenticated.
    return this.commentsService.getCommentsForTask(taskId);
  }
}
