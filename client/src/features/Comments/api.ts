// client/src/features/Comments/api.ts
import { taskService, CreateCommentPayloadDto, CommentDto } from '../../shared/api/taskService';

export const getTaskComments = (taskId: string): Promise<CommentDto[]> => {
  return taskService.getTaskComments(taskId);
};

export const addTaskComment = (taskId: string, data: CreateCommentPayloadDto): Promise<CommentDto> => {
  return taskService.addTaskComment(taskId, data);
};
