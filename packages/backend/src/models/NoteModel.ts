import { ISkewerModel, SchemaType } from '../utils/mongoModel';

import { createStorageModel } from '../utils/storageModelFactory';

export interface INote {
  symbol: string; // uppercased ticker, used as record ID
  body: string;
}

export const NoteSchema: SchemaType = {
  symbol: { type: String, required: true },
  body: { type: String, required: true },
};

export interface INoteModel extends INote, ISkewerModel {}

export const NoteModel = createStorageModel<INoteModel>('notes', NoteSchema);
