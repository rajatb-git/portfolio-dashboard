import { Db, MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;

export const DEFAULT_MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'portfolio_dashboard';
export const DEMO_MONGO_DB_NAME = `${DEFAULT_MONGO_DB_NAME}_demo`;

let clientPromise: Promise<MongoClient> | null = null;

// Shared across every model — one MongoClient (and its internal pool) for the
// whole process. Only the logical Db differs between real and demo mode.
const getClient = (): Promise<MongoClient> => {
  if (!MONGO_URI) {
    return Promise.reject(
      new Error('MONGO_URI is not set. Configure it in packages/backend/.env — see .env.example.')
    );
  }
  if (!clientPromise) {
    const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    clientPromise = client.connect().catch((err) => {
      // Don't cache a dead connection attempt — let the next caller retry
      // instead of staying wedged until process restart.
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
};

export const getMongoDb = async (dbName?: string): Promise<Db> => {
  const client = await getClient();
  return client.db(dbName || DEFAULT_MONGO_DB_NAME);
};
