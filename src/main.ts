import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get ConfigService instance
  const configService = app.get(ConfigService);
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false, // Tạm thời tắt để debug
    transform: true,
    skipMissingProperties: false,
    transformOptions: { enableImplicitConversion: true },
  }));
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors();
  
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
