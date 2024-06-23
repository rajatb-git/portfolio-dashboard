import axios from 'axios';

import { DB_HOST } from '@/config';

export default class LogsAPI {
  getLogs = async (file: string): Promise<string> =>
    axios(DB_HOST + `/logs/${file}`).then((response) => {
      return response.data;
    });
}
