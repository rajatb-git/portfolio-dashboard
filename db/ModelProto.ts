import fs from 'fs';

import { v4 as uuidv4 } from 'uuid';

export interface IModel {
  id: string;
}

interface GenericRecordType<T extends { id: string }> {
  [id: string]: T;
}

// todo:
// 1 - and indexing spec
// 2 - force unique fields on index
export class Model<T extends { id: string }> {
  name: string;

  path: string;

  constructor(name: string) {
    this.name = name;
    this.path = `${process.cwd()}/db/storage/${name}.json`;

    this.initialize();
  }

  private initialize() {
    if (!fs.existsSync(this.path)) {
      fs.writeFileSync(this.path, '{}');
    }
  }

  private loadFile(): GenericRecordType<T> {
    return JSON.parse(
      fs.readFileSync(this.path, {
        encoding: 'utf-8',
      })
    );
  }

  public getAllRecords(): Array<T> {
    const file = this.loadFile();

    return Object.values(file);
  }

  public findById(recordId: string): T {
    const records = this.loadFile();
    return records[recordId];
  }

  public insertOne(record: any): T {
    const records = this.loadFile();

    const newId = uuidv4();
    record.id = newId;
    records[newId] = record;

    this.saveState(records);

    return record;
  }

  public insertMany(newRecords: Array<any>): GenericRecordType<T> {
    const records = this.loadFile();

    newRecords.forEach((x) => {
      const newId = uuidv4();
      x.id = newId;

      records[newId] = x;
    });

    this.saveState(records);

    return records;
  }

  public updateOne(recordId: string, record: T): void {
    const records = this.loadFile();

    records[recordId] = record;
    this.saveState(records);
  }

  public deleteOne(recordId: string): T {
    const records = this.loadFile();

    const { recordId: deletedRecord, ...rest } = records;

    this.saveState(rest);

    return deletedRecord;
  }

  private saveState(records: GenericRecordType<T>): void {
    fs.writeFileSync(this.path, JSON.stringify(records));
  }
}
