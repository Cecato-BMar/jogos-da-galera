import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: 'jogos-da-galera-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
