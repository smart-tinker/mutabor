import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const keyHex = this.configService.get<string>('AI_CREDENTIALS_ENCRYPTION_KEY');
    if (!keyHex) {
        this.logger.warn('AI_CREDENTIALS_ENCRYPTION_KEY is not set. Encryption service will be disabled.');
        return;
    }
    if (keyHex.length !== 64) {
        throw new Error('AI_CREDENTIALS_ENCRYPTION_KEY must be 32 bytes (64 hex characters) long.');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    this.logger.log('Encryption service initialized successfully.');
  }

  encrypt(text: string): string {
    if (!this.encryptionKey) {
        throw new InternalServerErrorException('Encryption key is not configured.');
    }
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Храним iv, authTag и зашифрованные данные вместе в одной hex-строке
    return Buffer.concat([iv, authTag, encrypted]).toString('hex');
  }

  decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException('Encryption key is not configured.');
    }

    /*
     * Для будущей ротации ключей:
     * 1. В БД добавить поле `encryption_key_version`.
     * 2. В .env хранить несколько ключей: AI_CREDENTIALS_ENCRYPTION_KEY_V1, AI_CREDENTIALS_ENCRYPTION_KEY_V2 и т.д.
     * 3. В конструкторе загрузить все ключи в Map<number, Buffer>.
     * 4. Этот метод будет принимать `keyVersion` и выбирать нужный ключ из Map для дешифровки.
     */

    const data = Buffer.from(encryptedText, 'hex');
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return decrypted.toString('utf8');
  }
}