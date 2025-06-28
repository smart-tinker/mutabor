import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAiSettingsDto {
  @ApiProperty({ description: "Identifier for the AI provider, e.g., 'openai_compatible' or 'google_gemini'", example: 'openai_compatible' })
  @IsString()
  @IsNotEmpty()
  provider_name: string;

  @ApiProperty({ description: 'The base URL for the AI provider API.', example: 'http://localhost:1234/v1' })
  @IsUrl()
  base_url: string;

  @ApiProperty({ description: 'The specific model to use for AI requests.', required: false, example: 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF' })
  @IsOptional()
  @IsString()
  model_name?: string;

  @ApiProperty({ description: 'The API Key for the provider. Will be stored encrypted. Not returned on GET requests.', required: false })
  @IsOptional()
  @IsString()
  api_key?: string;
}