import { randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';

import { getMongoDb } from './mongoClient';

export type SchemaType = {
  [key: string]: {
    type: StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor;
    required?: boolean;
    enum?: Array<string>;
  };
};

export interface ISkewerModel {
  [index: string]: any;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export class RecordNotFoundError extends Error {
  constructor() {
    super('Record not found!');
    this.name = 'RecordNotFoundError';
  }
}

export class DuplicateIdError extends Error {
  constructor() {
    super('A record with this ID already exists in the database!');
    this.name = 'DuplicateIdError';
  }
}

export class SchemaValidationError extends Error {
  constructor(key: string, criteria: string) {
    super(`The field ${key} is invalid and fails the criteria ${criteria}!`);
    this.name = 'SchemaValidationError';
  }
}

type DataCache<T> = { [id: string]: T };

// MongoDB-backed drop-in for skewer-db's SkewerModel. Preserves its exact
// contract — initialize() loads the whole collection into an in-memory cache,
// getAllRecords/findById/find/countAll are synchronous reads against that
// cache (never a live query — initialize() already fetched fresh data for
// this call), and every write updates the cache in addition to persisting so
// long-lived singletons (LiveQuoteController, LiveRecommendationController)
// keep seeing their own writes without re-querying.
export class MongoModel<T extends ISkewerModel> {
  private dataCache: DataCache<T> = {};
  private collectionPromise: Promise<Collection<any>> | null = null;

  constructor(
    private readonly name: string,
    private readonly schema: SchemaType,
    private readonly dbName?: string
  ) {}

  private getCollection(): Promise<Collection<any>> {
    if (!this.collectionPromise) {
      this.collectionPromise = getMongoDb(this.dbName).then((db) => db.collection(this.name));
    }
    return this.collectionPromise;
  }

  private validateSchema(record: any): void {
    for (const key in this.schema) {
      const def = this.schema[key];
      const value = record[key];

      if (def.required && !value?.toString()) {
        throw new SchemaValidationError(key, 'required field');
      }
      if (value && value.toString() && value.constructor !== def.type) {
        throw new SchemaValidationError(`${value}`, `should be of type ${def.type.name}`);
      }
      if (value && def.enum && def.type === String && !def.enum.includes(value)) {
        throw new SchemaValidationError(`${value}`, `enum ${def.enum}`);
      }
    }
  }

  async initialize(): Promise<this> {
    const collection = await this.getCollection();
    const docs = await collection.find({}).sort({ createdAt: 1 }).toArray();
    const cache: DataCache<T> = {};
    for (const doc of docs) {
      const { _id, ...rest } = doc as any;
      cache[_id as string] = rest as T;
    }
    this.dataCache = cache;
    return this;
  }

  getAllRecords(): Array<T> {
    return Object.values(this.dataCache);
  }

  findById(recordId: string): T | undefined {
    return this.dataCache[recordId];
  }

  find(searchParams: { [key: string]: string | number | boolean }): Array<T> {
    const entries = Object.entries(searchParams);
    return Object.values(this.dataCache).filter((record) => entries.every(([key, value]) => record[key] === value));
  }

  countAll(): number {
    return Object.keys(this.dataCache).length;
  }

  async insertOne(record: any, id?: string): Promise<T> {
    this.validateSchema(record);
    const { id: _incomingId, ...stripped } = record;
    const newId = id || randomUUID();
    const now = new Date().toISOString();
    const fullRecord = { ...stripped, id: newId, createdAt: now, updatedAt: now } as T;

    const collection = await this.getCollection();
    try {
      await collection.insertOne({ _id: newId, ...fullRecord } as any);
    } catch (err: any) {
      if (err?.code === 11000) throw new DuplicateIdError();
      throw err;
    }
    this.dataCache[newId] = fullRecord;
    return fullRecord;
  }

  async insertMany(newRecords: Array<any>): Promise<Array<T>> {
    const now = new Date().toISOString();
    const prepared = newRecords.map((record) => {
      this.validateSchema(record);
      const newId = record.id || randomUUID();
      return { ...record, id: newId, createdAt: now, updatedAt: now } as T;
    });

    if (prepared.length) {
      const collection = await this.getCollection();
      await collection.insertMany(
        prepared.map((record) => ({ _id: record.id, ...record })) as any,
        { ordered: true }
      );
    }
    for (const record of prepared) this.dataCache[record.id] = record;
    return prepared;
  }

  async updateById(recordId: string, newRecord: Partial<T>): Promise<T> {
    const oldRecord = this.dataCache[recordId];
    if (!oldRecord) throw new RecordNotFoundError();

    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...stripped } = newRecord as any;
    const merged = { ...oldRecord, ...stripped, updatedAt: new Date().toISOString() } as T;
    this.validateSchema(merged);

    const collection = await this.getCollection();
    await collection.replaceOne({ _id: recordId } as any, { _id: recordId, ...merged } as any);
    this.dataCache[recordId] = merged;
    return merged;
  }

  async insertOrUpdate(record: Partial<T>, id: string): Promise<T> {
    if (this.dataCache[id]) return this.updateById(id, record);
    return this.insertOne(record, id);
  }

  async deleteById(recordId: string): Promise<T> {
    const deletedRecord = this.dataCache[recordId];
    if (!deletedRecord) throw new RecordNotFoundError();

    const collection = await this.getCollection();
    await collection.deleteOne({ _id: recordId } as any);
    delete this.dataCache[recordId];
    return deletedRecord;
  }

  async deleteAll(): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({});
    this.dataCache = {};
  }
}
