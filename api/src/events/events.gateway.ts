import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TaskRecord, CommentRecord, NotificationRecord } from 'src/types/db-records';

@WebSocketGateway({
  cors: {
    origin: '*', // В production следует указать конкретный домен фронтенда
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinProjectRoom')
  handleJoinRoom(@MessageBody() projectId: string, @ConnectedSocket() client: Socket) {
    const room = `project:${projectId}`;
    this.logger.log(`Client ${client.id} joining project room: ${room}`);
    client.join(room);
    return { event: 'joinedProjectRoom', data: projectId };
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
      if (userId && typeof userId === 'string') {
          const room = `user:${userId}`;
          this.logger.log(`Client ${client.id} joining user room: ${room}`);
          client.join(room);
          return { event: 'joinedUserRoom', data: room };
      }
      return { event: 'joinUserRoomFailed', data: 'Invalid userId provided' };
  }

  // --- Методы для отправки событий из сервисов ---

  emitTaskCreated(task: TaskRecord) {
    const room = `project:${task.project_id}`;
    this.logger.log(`Emitting task:created to room ${room}`);
    this.server.to(room).emit('task:created', task);
  }

  emitTaskUpdated(task: TaskRecord) {
    const room = `project:${task.project_id}`;
    this.logger.log(`Emitting task:updated to room ${room}`);
    this.server.to(room).emit('task:updated', task);
  }

  emitTaskMoved(task: TaskRecord) {
    const room = `project:${task.project_id}`;
    this.logger.log(`Emitting task:moved to room ${room}`);
    this.server.to(room).emit('task:moved', task);
  }

  emitCommentCreated(comment: CommentRecord, projectId: number) {
    const room = `project:${projectId}`;
    this.logger.log(`Emitting comment:created to room ${room}`);
    this.server.to(room).emit('comment:created', comment);
  }

  emitCommentDeleted(commentId: string, taskId: string, projectId: number) {
    const room = `project:${projectId}`;
    this.logger.log(`Emitting comment:deleted to room ${room}`);
    this.server.to(room).emit('comment:deleted', { commentId, taskId });
  }

  emitNotificationNew(notification: NotificationRecord) {
    const room = `user:${notification.recipient_id}`;
    this.logger.log(`Emitting notification:new to room ${room}`);
    this.server.to(room).emit('notification:new', notification);
  }

  emitNotificationRead(notification: NotificationRecord) {
    const room = `user:${notification.recipient_id}`;
    this.logger.log(`Emitting notification:read to room ${room}`);
    this.server.to(room).emit('notification:read', notification);
  }
}