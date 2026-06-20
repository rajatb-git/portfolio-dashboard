import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface INote {
  symbol: string; // uppercased ticker, used as record ID
  body: string;
}

export const NoteSchema: SchemaType = {
  symbol: { type: String, required: true },
  body: { type: String, required: true },
};

export interface INoteModel extends INote, ISkewerModel {}

let instance: SkewerModel<INoteModel> | null = null;

export const NoteModel = (): SkewerModel<INoteModel> => {
  if (!instance) {
    instance = new SkewerModel<INoteModel>('notes', NoteSchema);
  }
  return instance;
};
