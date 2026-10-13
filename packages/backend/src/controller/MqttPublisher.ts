import mqtt, { type MqttClient } from 'mqtt';
import type { IMqttConfig } from '../models/NotificationConfigModel';
import { logger } from '../utils/winston';

const LABEL = 'MqttPublisher';

const PUBLISH_TIMEOUT_MS = 10_000;
const MAX_PUBLISH_ATTEMPTS = 3;
const RECONNECT_WAIT_MS = 20_000;

// Singleton MQTT connection driven by the saved notification config. Keeps one
// persistent client (with the library's built-in auto-reconnect) and publishes
// alert messages to a topic. All errors are logged, never thrown to callers.
class MqttPublisher {
  private client: MqttClient | null = null;
  private config: IMqttConfig | null = null;
  private lastConnectAt = 0;
  private rebuilding: Promise<void> | null = null;

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
      this.client.on('connect', () => {
        this.lastConnectAt = Date.now();
        logger.log({ level: 'info', label: LABEL, message: `Connected to ${config.url}` });
      });
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

  // Publish to the configured topic, retrying on a fresh connection when an
  // attempt fails. Resolves false (never rejects) once every attempt has failed.
  async publish(payload: string, topicOverride?: string): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_PUBLISH_ATTEMPTS; attempt++) {
      if (await this.publishOnce(payload, topicOverride)) return true;
      if (attempt === MAX_PUBLISH_ATTEMPTS || !this.isEnabled()) break;
      logger.log({
        level: 'warn',
        label: LABEL,
        message: `Publish attempt ${attempt} failed — reconnecting and retrying`,
      });
      await this.rebuildConnection();
    }
    logger.log({
      level: 'error',
      label: LABEL,
      message: `Message dropped (${payload.length} bytes) after ${MAX_PUBLISH_ATTEMPTS} attempts`,
    });
    return false;
  }

  // A publish that times out usually means the socket died without either end
  // noticing — the client still thinks it is connected and queues into a dead
  // connection, which is how the alert burst after the open was being lost every
  // morning. Start over on a fresh connection. Concurrent failures share one
  // rebuild, and a connection made moments ago is reused rather than torn down
  // under the retries already riding on it.
  private rebuildConnection(): Promise<void> {
    if (this.client?.connected && Date.now() - this.lastConnectAt < RECONNECT_WAIT_MS) return Promise.resolve();
    if (!this.rebuilding) {
      this.rebuilding = new Promise<void>((resolve) => {
        if (!this.config) return resolve();
        this.configure(this.config);
        const client = this.client;
        if (!client) return resolve();
        const timer = setTimeout(resolve, RECONNECT_WAIT_MS);
        client.once('connect', () => {
          clearTimeout(timer);
          resolve();
        });
      }).finally(() => {
        this.rebuilding = null;
      });
    }
    return this.rebuilding;
  }

  private publishOnce(payload: string, topicOverride?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = this.client;
      if (!client || !this.config) {
        logger.log({ level: 'warn', label: LABEL, message: 'Publish skipped — MQTT client not connected/configured' });
        resolve(false);
        return;
      }
      const topic = topicOverride || this.config.topic;
      logger.log({
        level: 'info',
        label: LABEL,
        message: `Publishing ${payload.length} bytes to "${topic}" (qos ${this.config.qos}, retain ${this.config.retain})`,
      });
      const timer = setTimeout(() => {
        logger.log({
          level: 'warn',
          label: LABEL,
          message: `Publish to "${topic}" timed out after ${PUBLISH_TIMEOUT_MS / 1000}s`,
        });
        resolve(false);
      }, PUBLISH_TIMEOUT_MS);
      client.publish(topic, payload, { qos: this.config.qos, retain: this.config.retain }, (err) => {
        clearTimeout(timer);
        if (err) {
          logger.log({ level: 'warn', label: LABEL, message: `Publish to "${topic}" failed: ${err.message}` });
          resolve(false);
          return;
        }
        logger.log({ level: 'info', label: LABEL, message: `Published ${payload.length} bytes to "${topic}"` });
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
