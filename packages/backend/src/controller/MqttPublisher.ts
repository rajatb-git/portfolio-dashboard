import mqtt, { type MqttClient } from 'mqtt';
import type { IMqttConfig } from '../models/NotificationConfigModel';
import { logger } from '../utils/winston';

const LABEL = 'MqttPublisher';

// Singleton MQTT connection driven by the saved notification config. Keeps one
// persistent client (with the library's built-in auto-reconnect) and publishes
// alert messages to a topic. All errors are logged, never thrown to callers.
class MqttPublisher {
  private client: MqttClient | null = null;
  private config: IMqttConfig | null = null;

  configure(config: IMqttConfig): void {
    // Tear down on any change so credentials/url updates take effect cleanly.
    this.disconnect();
    this.config = config;
    if (!config.enabled || !config.url) return;

    try {
      this.client = mqtt.connect(config.url, {
        username: config.username || undefined,
        password: config.password || undefined,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        clientId: `portfolio-dashboard_${Math.random().toString(16).slice(2, 10)}`,
      });
      this.client.on('connect', () =>
        logger.log({ level: 'info', label: LABEL, message: `Connected to ${config.url}` })
      );
      this.client.on('error', (err) => logger.log({ level: 'error', label: LABEL, message: err.message }));
      this.client.on('offline', () => logger.log({ level: 'warn', label: LABEL, message: 'Client offline' }));
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to connect: ${err.message}` });
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return !!this.config?.enabled && !!this.config.url;
  }

  // Publish to the configured topic. Resolves false (never rejects) on failure.
  publish(payload: string, topicOverride?: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.client || !this.config) {
        resolve(false);
        return;
      }
      const topic = topicOverride || this.config.topic;
      const timer = setTimeout(() => resolve(false), 10000);
      this.client.publish(topic, payload, { qos: this.config.qos, retain: this.config.retain }, (err) => {
        clearTimeout(timer);
        if (err) {
          logger.log({ level: 'error', label: LABEL, message: `Publish failed: ${err.message}` });
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  private disconnect(): void {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore teardown errors
      }
      this.client = null;
    }
  }
}

export const mqttPublisher = new MqttPublisher();
