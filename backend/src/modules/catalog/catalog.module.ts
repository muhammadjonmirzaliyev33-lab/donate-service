import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SupplierModule } from '../supplier/supplier.module';
import { CatalogController } from './controllers/catalog.controller';
import { AdminCatalogController } from './controllers/admin-catalog.controller';
import { CatalogService } from './services/catalog.service';
import { GamesRepository } from './repositories/games.repository';
import { PackagesRepository } from './repositories/packages.repository';

@Module({
  imports: [AuthModule, UploadsModule, SupplierModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService, GamesRepository, PackagesRepository],
  exports: [CatalogService, GamesRepository, PackagesRepository],
})
export class CatalogModule {}
