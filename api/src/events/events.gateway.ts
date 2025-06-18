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

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this more restrictively in production!
  },
  // path: '/socket.io' // Default path
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    // Conceptual: Extract userId from handshake/auth, e.g., from a token
    // const token = client.handshake.auth.token;
    // try {
    //   const payload = this.jwtService.verify(token); // Assuming JWT auth
    //   const userId = payload.sub; // Or whatever your JWT subject is for user ID
    //   if (userId) {
    //     this.logger.log(`Client ${client.id} (User ${userId}) joining user room: user:${userId}`);
    //     client.join(`user:${userId}`);
    //   }
    // } catch (e) {
    //   this.logger.error(`Socket connection auth failed for ${client.id}: ${e.message}`);
    //   client.disconnect(); // Or handle unauthorized connection appropriately
    //   return;
    // }
    // client.join(`project-${projectId}`); // Project room joining is separate via @SubscribeMessage
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Example of a subscription if clients need to send messages to server
  @SubscribeMessage('joinProjectRoom')
  handleJoinRoom(@MessageBody() projectId: string, @ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} joining project room: ${projectId}`);
    client.join(`project:${projectId}`); // Room naming convention: project:<projectId>
    return { event: 'joinedProjectRoom', data: projectId };
  }

  @SubscribeMessage('leaveProjectRoom')
  handleLeaveRoom(@MessageBody() projectId: string, @ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} leaving project room: ${projectId}`);
    client.leave(`project:${projectId}`);
    return { event: 'leftProjectRoom', data: projectId };
  }

  // Methods to be called by services to emit events
  // These methods will broadcast to specific rooms (e.g., a project room)

  emitTaskCreated(task: any) { // Use a proper Task DTO/type
    if (task && task.projectId) {
      this.logger.log(`Emitting task:created for project ${task.projectId}, task ${task.id}`);
      this.server.to(`project:${task.projectId}`).emit('task:created', task);
    }
  }

  emitTaskUpdated(task: any) { // Use a proper Task DTO/type
    if (task && task.projectId) {
      this.logger.log(`Emitting task:updated for project ${task.projectId}, task ${task.id}`);
      this.server.to(`project:${task.projectId}`).emit('task:updated', task);
    }
  }

  emitTaskMoved(task: any) { // Use a proper Task DTO/type
     if (task && task.projectId) {
      this.logger.log(`Emitting task:moved for project ${task.projectId}, task ${task.id}`);
      this.server.to(`project:${task.projectId}`).emit('task:moved', task);
    }
  }

  // Consider adding similar events for Columns if they can be managed dynamically
  // emitColumnCreated(column: any) { ... }
  // emitColumnUpdated(column: any) { ... }
  // emitColumnDeleted(column: any) { ... }

  @SubscribeMessage('joinUserRoom') // Client explicitly asks to join its user room after connection/auth
  handleJoinUserRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
      if (userId && typeof userId === 'string') { // Basic validation
          this.logger.log(`Client ${client.id} joining user room: user:${userId}`);
          client.join(`user:${userId}`);
          return { event: 'joinedUserRoom', data: `user:${userId}` };
      }
      return { event: 'joinUserRoomFailed', data: 'Invalid userId provided' };
  }

  emitCommentCreated(comment: any, projectId: number | string) {
    if (comment && projectId) {
      const room = `project:${projectId}`;
      this.logger.log(`Emitting comment:created to room ${room}, commentId ${comment.id}`);
      this.server.to(room).emit('comment:created', comment);
    }
  }

  emitNotificationNew(notification: any, recipientId: string) {
    if (notification && recipientId) {
      const room = `user:${recipientId}`;
      this.logger.log(`Emitting notification:new to room ${room}, notificationId ${notification.id}`);
      this.server.to(room).emit('notification:new', notification);
    }
  }
}
