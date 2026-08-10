import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IIpoAnnouncementConfig {
  enabled: boolean;
  // MQTT topic new-IPO announcements are published to. Kept separate from the
  // reminder/alert topics so subscribers can route announcements differently.
  topic: string;
}

const IpoAnnouncementConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  topic: { type: String, required: false },
};

interface IIpoAnnouncementConfigModel extends IIpoAnnouncementConfig, ISkewerModel {}

const IpoAnnouncementConfigDBModel = () =>
  new MongoModel<IIpoAnnouncementConfigModel>('ipo_announcement_config', IpoAnnouncementConfigSchema);

const CONFIG_ID = 'ipo_announcement_config';

export const DEFAULT_IPO_ANNOUNCEMENT_CONFIG: IIpoAnnouncementConfig = {
  enabled: false,
  topic: 'portfolio-dashboard/ipo-announcements',
};

export async function getIpoAnnouncementConfig(): Promise<IIpoAnnouncementConfig> {
  const model = await IpoAnnouncementConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    const d = DEFAULT_IPO_ANNOUNCEMENT_CONFIG;
    return {
      enabled: typeof existing.enabled === 'boolean' ? existing.enabled : d.enabled,
      topic: existing.topic || d.topic,
    };
  }
  return DEFAULT_IPO_ANNOUNCEMENT_CONFIG;
}

export async function saveIpoAnnouncementConfig(config: IIpoAnnouncementConfig): Promise<IIpoAnnouncementConfig> {
  const model = await IpoAnnouncementConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
