import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiProviderSettingsDto {
  @ApiProperty({ description: 'The base URL of the AI provider API.', example: 'http://localhost:1234/v1' })
  @IsUrl()
  @IsNotEmpty()
  baseUrl: string;
  
  @ApiProperty({ description: 'The API key for the provider. Will be encrypted.', required: false, example: 'sk-...' })
  @IsOptional()
  @IsString()
  apiKey?: string;
  
  @ApiProperty({ description: 'The specific model to use from the provider.', required: false, example: 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF' })
  @IsOptional()
  @IsString()
  modelName?: string;
}