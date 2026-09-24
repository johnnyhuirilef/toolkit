import { Injectable } from '@nestjs/common';
import { defineCollection } from '@wenu/mongo';
import type { Repository } from '@wenu/mongo';
import * as z from 'zod';

import { InjectRepository } from '../../../src/zod-mongo.decorators';

// Shared across every single-connection app module (uri/mongo-client/factory/options-class/
// existing-options) so each one stays a minimal, declarative wiring exercise instead of
// redefining the same collection and repository-consuming service six times.
export const ItemCollection = defineCollection({
  name: 'items',
  schema: z.object({ label: z.string() }),
  idStrategy: 'objectid',
});

export type ItemRepository = Repository<typeof ItemCollection.schema, 'objectid'>;

@Injectable()
export class ItemService {
  constructor(@InjectRepository(ItemCollection) private readonly repository: ItemRepository) {}

  insert(label: string) {
    return this.repository.insert({ label });
  }

  findById(id: Parameters<ItemRepository['findById']>[0]) {
    return this.repository.findById(id);
  }
}
