import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { MatchingModule } from './matching/matching.module';
import { ItemsModule } from './items/items.module';
import { MatchesModule } from './matches/matches.module';
import { PickupsModule } from './pickups/pickups.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MatchingModule,
    AuthModule,
    ReportsModule,
    ItemsModule,
    SearchModule,
    MatchesModule,
    PickupsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
