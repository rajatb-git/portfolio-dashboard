import crypto from 'node:crypto';
import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface ILockConfig {
  enabled: boolean;
  codeHash: string;
  codeSalt: string;
  sessionSecret: string;
  idleTimeoutMinutes: number;
}

export const LockConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  codeHash: { type: String, required: false },
  codeSalt: { type: String, required: false },
  sessionSecret: { type: String, required: false },
  idleTimeoutMinutes: { type: Number, required: true },
};

export interface ILockConfigModel extends ILockConfig, ISkewerModel {}

export const LockConfigDBModel = () => new MongoModel<ILockConfigModel>('lock_config', LockConfigSchema);

const CONFIG_ID = 'lock_config';

export const DEFAULT_LOCK_CONFIG: ILockConfig = {
  enabled: false,
  codeHash: '',
  codeSalt: '',
  sessionSecret: '',
  idleTimeoutMinutes: 15,
};

function hashCode(code: string, saltHex: string): string {
  return crypto.scryptSync(code, Buffer.from(saltHex, 'hex'), 64).toString('hex');
}

export async function getLockConfig(): Promise<ILockConfig> {
  const model = await LockConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      enabled: existing.enabled,
      codeHash: existing.codeHash ?? '',
      codeSalt: existing.codeSalt ?? '',
      sessionSecret: existing.sessionSecret ?? '',
      idleTimeoutMinutes:
        typeof existing.idleTimeoutMinutes === 'number'
          ? existing.idleTimeoutMinutes
          : DEFAULT_LOCK_CONFIG.idleTimeoutMinutes,
    };
  }
  return DEFAULT_LOCK_CONFIG;
}

export async function getLockStatus(): Promise<{ enabled: boolean; idleTimeoutMinutes: number }> {
  const cfg = await getLockConfig();
  return { enabled: cfg.enabled, idleTimeoutMinutes: cfg.idleTimeoutMinutes };
}

export async function verifyCode(code: string): Promise<boolean> {
  const cfg = await getLockConfig();
  if (!cfg.enabled || !cfg.codeHash || !cfg.codeSalt) return false;
  const candidate = Buffer.from(hashCode(code, cfg.codeSalt), 'hex');
  const expected = Buffer.from(cfg.codeHash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export async function getSessionSecret(): Promise<string> {
  const cfg = await getLockConfig();
  return cfg.sessionSecret;
}

export async function setLockConfig(input: {
  enabled: boolean;
  code?: string;
  currentCode?: string;
  idleTimeoutMinutes?: number;
}): Promise<{ enabled: boolean; idleTimeoutMinutes: number }> {
  const current = await getLockConfig();
  const model = await LockConfigDBModel().initialize();

  if (current.enabled) {
    if (!input.currentCode) {
      throw Object.assign(new Error('Current code is required'), { name: 'Wrong code' });
    }
    const ok = await verifyCode(input.currentCode);
    if (!ok) {
      throw Object.assign(new Error('Current code is incorrect'), { name: 'Wrong code' });
    }
  }

  let next: ILockConfig;
  if (!input.enabled) {
    next = {
      enabled: false,
      codeHash: '',
      codeSalt: '',
      sessionSecret: '',
      idleTimeoutMinutes:
        typeof input.idleTimeoutMinutes === 'number'
          ? input.idleTimeoutMinutes
          : current.idleTimeoutMinutes,
    };
  } else {
    const changingCode = !!input.code;
    const enablingFromOff = !current.enabled;
    if (enablingFromOff && !input.code) {
      throw Object.assign(new Error('New code is required'), { name: 'Invalid code' });
    }
    const saltHex = changingCode ? crypto.randomBytes(16).toString('hex') : current.codeSalt;
    const codeHash = changingCode ? hashCode(input.code as string, saltHex) : current.codeHash;
    const sessionSecret =
      enablingFromOff || !current.sessionSecret
        ? crypto.randomBytes(32).toString('hex')
        : current.sessionSecret;
    next = {
      enabled: true,
      codeHash,
      codeSalt: saltHex,
      sessionSecret,
      idleTimeoutMinutes:
        typeof input.idleTimeoutMinutes === 'number'
          ? input.idleTimeoutMinutes
          : current.idleTimeoutMinutes,
    };
  }

  await model.insertOrUpdate(next, CONFIG_ID);
  return { enabled: next.enabled, idleTimeoutMinutes: next.idleTimeoutMinutes };
}
