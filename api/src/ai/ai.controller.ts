import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, Get, Put, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
// ### ИЗМЕНЕНИЕ: Убраны импорты, связанные с авторизацией (проверкой ролей) ###
// import { PoliciesGuard } from '../casl/policies.guard';
// import { CheckPolicies } from '../casl/check-policies.decorator';
// import { CanManageProjectSettingsPolicy } from '../casl/project-policies.handler';
import { AssistRequestDto } from './dto/assist-request.dto';


@ApiBearerAuth()
@ApiTags('AI')
// ### ИЗМЕНЕНИЕ: PoliciesGuard убран из списка гвардов. ###
@UseGuards(JwtAuthGuard)
@Controller('api/v1') // Префикс остается, т.к. глобальный убран
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ai/assist')
  @ApiOperation({ summary: 'Invoke the AI assistant' })
  @ApiResponse({ status: 200, description: 'AI task completed successfully.'})
  @ApiResponse({ status: 400, description: 'Invalid request or AI settings not configured.'})
  @HttpCode(HttpStatus.OK)
  async assist(
    @Body() assistRequestDto: AssistRequestDto,
    @Req() req,
  ) {
    // В будущем здесь нужно будет добавить проверку прав доступа к задаче
    return this.aiService.handleAssistRequest(assistRequestDto, req.user);
  }

  @Get('projects/:projectId/ai/settings')
  @ApiOperation({ summary: "Get a project's AI provider settings" })
  // ### ИЗМЕНЕНИЕ: Декоратор @CheckPolicies убран. ###
  // @CheckPolicies(new CanManageProjectSettingsPolicy())
  async getAiSettings(@Param('projectId', ParseIntPipe) projectId: number) {
    // В будущем здесь нужно будет добавить проверку прав доступа к проекту
    return this.aiService.getSettingsForProject(projectId);
  }

  @Put('projects/:projectId/ai/settings')
  @ApiOperation({ summary: "Update a project's AI provider settings" })
  // ### ИЗМЕНЕНИЕ: Декоратор @CheckPolicies убран. ###
  // @CheckPolicies(new CanManageProjectSettingsPolicy())
  async updateAiSettings(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() settingsDto: UpdateAiSettingsDto,
  ) {
    // В будущем здесь нужно будет добавить проверку прав доступа к проекту
    return this.aiService.updateSettingsForProject(projectId, settingsDto);
  }

  @Get('projects/:projectId/ai/models')
  @ApiOperation({ summary: 'List available models from the configured AI provider' })
  // ### ИЗМЕНЕНИЕ: Декоратор @CheckPolicies убран. ###
  // @CheckPolicies(new CanManageProjectSettingsPolicy())
  async listModels(@Param('projectId', ParseIntPipe) projectId: number) {
    // В будущем здесь нужно будет добавить проверку прав доступа к проекту
    return this.aiService.listModelsForProject(projectId);
  }
}