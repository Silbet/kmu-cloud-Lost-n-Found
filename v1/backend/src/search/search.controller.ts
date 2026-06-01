import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('lost')
  searchLost(@Query() query: Record<string, string>, @Req() req: Request) {
    return this.search.searchLost(query, this.isLoggedIn(req));
  }

  @Get('found')
  searchFound(@Query() query: Record<string, string>, @Req() req: Request) {
    return this.search.searchFound(query, this.isLoggedIn(req));
  }

  private isLoggedIn(req: Request) {
    return Boolean(req.headers.authorization);
  }
}
