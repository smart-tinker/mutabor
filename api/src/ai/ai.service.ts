// api/src/ai/ai.service.ts
import { Injectable, Inject, forwardRef, BadRequestException, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import OpenAI from 'openai';
import { AssistRequestDto, AiAction, ContextType } from './dto/assist-request.dto';
import { ProjectsService } from '../projects/projects.service';
import { UserRecord } from 'src/types/db-records';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { EncryptionService } from '../common/services/encryption.service';
import { Role } from '../casl/roles.enum';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { TasksService } from '../tasks/tasks.service';

interface AiProviderSettings {
    id: number;
    project_id: number;
    provider_name: string;
    base_url: string;
    model_name: string | null;
    encrypted_api_key: string | null;
    encryption_key_version: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private clientCache = new Map<number, OpenAI>(); // Кэш клиентов для проектов

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly encryptionService: EncryptionService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
  ) {}

  private async getClientForProject(projectId: number): Promise<{ client: OpenAI, settings: AiProviderSettings }> {
    // Проверяем кэш
    if (this.clientCache.has(projectId)) {
        const settings = await this.knex('ai_provider_settings').where({ project_id: projectId }).first();
        return { client: this.clientCache.get(projectId), settings };
    }

    const settings: AiProviderSettings = await this.knex('ai_provider_settings')
      .where({ project_id: projectId }).first();

    if (!settings) {
      throw new BadRequestException('AI settings are not configured for this project.');
    }

    let apiKey = 'not-needed'; // По умолчанию для LMStudio
    if (settings.encrypted_api_key) {
        apiKey = this.encryptionService.decrypt(settings.encrypted_api_key);
    }
    
    const client = new OpenAI({
      baseURL: settings.base_url,
      apiKey: apiKey,
    });
    
    // Кэшируем клиент, чтобы не создавать его при каждом запросе
    this.clientCache.set(projectId, client);
    
    return { client, settings };
  }

  async handleAssistRequest(dto: AssistRequestDto, user: UserRecord) {
    if (dto.contextType !== ContextType.TASK) {
      throw new BadRequestException(`Unsupported context type: ${dto.contextType}`);
    }
    
    const task = await this.knex('tasks').where({ id: dto.contextId }).first();
    if (!task) throw new NotFoundException(`Task with ID ${dto.contextId} not found.`);

    const userRole = await this.projectsService.getUserRoleForProject(task.project_id, user.id);
    if (userRole !== Role.Owner && userRole !== Role.Editor) {
        throw new ForbiddenException('You do not have permission to perform AI actions in this project.');
    }
    
    const { client, settings } = await this.getClientForProject(task.project_id);
    
    let prompt: string;
    switch (dto.action) {
      case AiAction.DECOMPOSE:
        prompt = this.getDecompositionPrompt(task.title, task.description);
        break;
      case AiAction.GENERATE_BRANCH_NAME:
        prompt = this.getBranchNamePrompt(task.title);
        break;
      default:
        throw new BadRequestException(`Unsupported action '${dto.action}' for context 'task'`);
    }
    
    const aiResponse = await this.generateText(client, settings.model_name, prompt);

    if (dto.action === AiAction.DECOMPOSE) {
        const newDescription = `${task.description || ''}\n\n---\n**AI Assistant Suggestion:**\n${aiResponse}`;
        await this.tasksService.updateTask(task.id, { description: newDescription }, user);
        return { message: 'Task decomposed successfully.', content: aiResponse };
    }
    
    if (dto.action === AiAction.GENERATE_BRANCH_NAME) {
        return { message: 'Branch name generated successfully', content: aiResponse };
    }
  }
  
  async getSettingsForProject(projectId: number) {
    const settings = await this.knex('ai_provider_settings')
      .where({ project_id: projectId })
      .select('id', 'project_id', 'provider_name', 'base_url', 'model_name')
      .first();
      
    return settings || null;
  }
  
  async updateSettingsForProject(projectId: number, dto: UpdateAiSettingsDto) {
    const { provider_name, base_url, model_name, api_key } = dto;
    
    let encrypted_api_key: string | null = null;
    if (api_key) {
        encrypted_api_key = this.encryptionService.encrypt(api_key);
    }
    
    const payload = {
        project_id: projectId,
        provider_name,
        base_url,
        model_name,
        encrypted_api_key,
        encryption_key_version: 1, // Задел на будущее
        updated_at: new Date()
    };

    await this.knex('ai_provider_settings')
      .insert(payload)
      .onConflict('project_id')
      .merge();
      
    // Сбрасываем кэш для данного проекта, чтобы при следующем запросе использовались новые настройки
    this.clientCache.delete(projectId);

    return { message: 'AI settings updated successfully.' };
  }

  async listModelsForProject(projectId: number): Promise<{ id: string }[]> {
    const { client } = await this.getClientForProject(projectId);
    try {
        const models = await client.models.list();
        return models.data.map(m => ({ id: m.id }));
    } catch (error) {
        this.logger.error(`Failed to fetch models for project ${projectId}`, error);
        throw new InternalServerErrorException('Could not connect to the AI provider to list models. Check the base URL and API key.');
    }
  }

  private getDecompositionPrompt(title: string, description?: string): string { return ''; }
  private getBranchNamePrompt(title: string): string { return ''; }
  private async generateText(client: OpenAI, modelName: string, prompt: string): Promise<string> { return Promise.resolve(''); }
}