import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IMqttConfig {
  enabled: boolean;
  url: string; // mqtt:// or mqtts://host:port
  username: string;
  password: string;
  topic: string;
  qos: 0 | 1;
  retain: boolean;
}

export interface INotificationConfig {
  mqtt: IMqttConfig;
}

// SkewerDB schemas are flat primitives, so the nested { mqtt } shape is stored
// as mqtt* columns and re-nested on read.
interface INotificationConfigFlat {
  mqttEnabled: boolean;
  mqttUrl: string;
  mqttUsername: string;
  mqttPassword: string;
  mqttTopic: string;
  mqttQos: number;
  mqttRetain: boolean;
}

const NotificationConfigSchema: SchemaType = {
  mqttEnabled: { type: Boolean, required: true },
  mqttUrl: { type: String, required: false },
  mqttUsername: { type: String, required: false },
  mqttPassword: { type: String, required: false },
  mqttTopic: { type: String, required: false },
  mqttQos: { type: Number, required: false },
  mqttRetain: { type: Boolean, required: false },
};

interface INotificationConfigModel extends INotificationConfigFlat, ISkewerModel {}

const NotificationConfigDBModel = () =>
  new SkewerModel<INotificationConfigModel>('notification_config', NotificationConfigSchema);

const CONFIG_ID = 'notification_config';

export const DEFAULT_NOTIFICATION_CONFIG: INotificationConfig = {
  mqtt: {
    enabled: false,
    url: '',
    username: '',
    password: '',
    topic: 'portfolio-dashboard/alerts',
    qos: 1,
    retain: false,
  },
};

const VALID_QOS = [0, 1];

function normalizeMqtt(raw: Partial<IMqttConfig> | undefined): IMqttConfig {
  const d = DEFAULT_NOTIFICATION_CONFIG.mqtt;
  const qos = Number(raw?.qos);
  return {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : d.enabled,
    url: raw?.url ?? d.url,
    username: raw?.username ?? d.username,
    password: raw?.password ?? d.password,
    topic: raw?.topic || d.topic,
    qos: (VALID_QOS.includes(qos) ? qos : d.qos) as 0 | 1,
    retain: typeof raw?.retain === 'boolean' ? raw.retain : d.retain,
  };
}

const toFlat = (mqtt: IMqttConfig): INotificationConfigFlat => ({
  mqttEnabled: mqtt.enabled,
  mqttUrl: mqtt.url,
  mqttUsername: mqtt.username,
  mqttPassword: mqtt.password,
  mqttTopic: mqtt.topic,
  mqttQos: mqtt.qos,
  mqttRetain: mqtt.retain,
});

export async function getNotificationConfig(): Promise<INotificationConfig> {
  const model = await NotificationConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      mqtt: normalizeMqtt({
        enabled: existing.mqttEnabled,
        url: existing.mqttUrl,
        username: existing.mqttUsername,
        password: existing.mqttPassword,
        topic: existing.mqttTopic,
        qos: existing.mqttQos as 0 | 1,
        retain: existing.mqttRetain,
      }),
    };
  }
  return DEFAULT_NOTIFICATION_CONFIG;
}

export async function saveNotificationConfig(config: INotificationConfig): Promise<INotificationConfig> {
  const model = await NotificationConfigDBModel().initialize();
  const mqtt = normalizeMqtt(config.mqtt);
  await model.insertOrUpdate(toFlat(mqtt), CONFIG_ID);
  return { mqtt };
}

const PASSWORD_MASK = '••••••••';

export function maskNotificationConfig(config: INotificationConfig): INotificationConfig {
  return { mqtt: { ...config.mqtt, password: config.mqtt.password ? PASSWORD_MASK : '' } };
}

export function isMaskedPassword(value: string): boolean {
  return value.startsWith('••');
}
