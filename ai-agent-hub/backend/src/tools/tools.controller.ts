import { Controller, Get } from '@nestjs/common';
import { ToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  /** Public catalog of available agent tools. */
  @Get()
  list() {
    return { tools: this.tools.list() };
  }
}
