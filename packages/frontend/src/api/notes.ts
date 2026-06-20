import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export type Note = { symbol: string; body: string };

export default class NotesAPI {
  get = async (symbol: string): Promise<Note> =>
    axios
      .get(DB_HOST + `/notes/${encodeURIComponent(symbol)}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  save = async (symbol: string, body: string): Promise<Note> =>
    axios
      .post(DB_HOST + `/notes/${encodeURIComponent(symbol)}`, { body })
      .then((response) => response.data)
      .catch(catchCustomError);
}
