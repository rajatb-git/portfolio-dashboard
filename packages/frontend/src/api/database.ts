import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export default class DatabaseAPI {
  getAll = async (collection: string): Promise<Array<any>> =>
    axios
      .get(DB_HOST + `/database/${encodeURIComponent(collection)}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  deleteById = async (collection: string, id: string): Promise<{ deleted: string }> =>
    axios
      .delete(DB_HOST + `/database/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  flush = async (collection: string): Promise<{ flushed: string; deletedCount: number }> =>
    axios
      .delete(DB_HOST + `/database/${encodeURIComponent(collection)}`)
      .then((response) => response.data)
      .catch(catchCustomError);
}
