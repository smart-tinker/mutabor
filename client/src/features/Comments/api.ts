// client/src/features/Comments/api.ts
import { taskService } from '../../shared/api/taskService';
import type { CreateCommentPayloadDto, CommentDto } from '../../shared/api/types';

export const getTaskComments = (taskId: string): Promise<CommentDto[]> => {
  return taskService.getTaskComments(taskId);
};

export const addTaskComment = (taskId: string, data: CreateCommentPayloadDto): Promise<CommentDto> => {
  return taskService.addTaskComment(taskId, data);
};