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
    // Future: Add logic for joining rooms based on project ID
    // client.join(`project-${projectId}`);
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
}
