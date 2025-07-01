// api/src/ai/dto/assist-request.dto.ts

// Минимальная заглушка, чтобы удовлетворить компилятор.
// Реальная реализация будет позже.

export enum ContextType {
  TASK = 'task',
}

export enum AiAction {
  DECOMPOSE = 'decompose',
  GENERATE_BRANCH_NAME = 'generate_branch_name',
}

export class AssistRequestDto {
  action: AiAction;
  contextType: ContextType;
  contextId: string;
}