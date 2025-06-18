export class TaskDto {
  id: string;
  humanReadableId: string;
  taskNumber: number;
  title: string;
  description?: string;
  position: number;
  projectId: number;
  columnId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
