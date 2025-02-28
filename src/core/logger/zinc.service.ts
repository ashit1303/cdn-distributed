import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ZincLogger implements LoggerService {
  private zincUrl: string;
  private zincIndex: string;
  private zincUsername: string;
  private zincPassword: string;
  private createdIndex: boolean;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.zincUrl = this.configService.get<string>('ZINC_URL') ;//|| 'http://127.0.0.1:4080';
    this.zincIndex = this.configService.get<string>('ZINC_INDEX') || 'logs';
    this.zincUsername = this.configService.get<string>('ZINC_USER');// || 'admin';
    this.zincPassword = this.configService.get<string>('ZINC_PASS');// || 'Complexpass#123';
    this.createdIndex = false;
  }
    // @TODO: RUN THIS FOR THE FIRST TIME FOR CREATING INDEX 
  async createIndex() {
    await axios.post(`${this.zincUrl}/api/index/error`),{"name":"error","storage_type":"disk","settings":{},"mappings":{}},{auth: { username: this.zincUsername, password: this.zincPassword }, headers: { 'Content-Type': 'application/json' },};
    await axios.post(`${this.zincUrl}/api/index/logs`),{"name":"logs","storage_type":"disk","settings":{},"mappings":{}},{auth: { username: this.zincUsername, password: this.zincPassword }, headers: { 'Content-Type': 'application/json' },};
    this.createdIndex= true;
  }
  // this.createIndex();

  //create logs and error in zincsearch
  async sendLog(level: string, message: string, context?: string | object, trace?: string|object) {
    const flattenedContext = context
    ? typeof context === 'object'
      ? context
      : { context }
    : {};
      
    const flattenedError = trace
    ? typeof trace === 'object'
      ? trace
      : { trace }
    : {};
      
  const logEntry = {
    level,
    message,
    // timestamp: new Date().toISOString(),
    ...flattenedContext,
    trace: trace || undefined,
  };
  try {
    // making this request non blocking 
    axios.post(
      `${this.zincUrl}/api/${this.zincIndex}/_doc`,
      logEntry,
      {
        auth: { username: this.zincUsername, password: this.zincPassword },
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    if(this.createdIndex == false){
    this.createIndex().catch();
    }
    console.error('Error sending log to ZincSearch:', error.message);
  }
  }

  log(message: string, context?: string | object) {
    this.sendLog('info', message, context);
  }

  error(message: string, trace?: string, context?: string | object) {
    console.log('Error', message, trace, context);
    this.sendLog('error', message, context, trace);
  }

  warn(message: string, context?: string | object) {
    this.sendLog('warn', message, context);
  }

  debug(message: string, context?: string | object) {
    this.sendLog('debug', message, context);
  }

  verbose(message: string, context?: string | object) {
    this.sendLog('verbose', message, context);
  }
}
