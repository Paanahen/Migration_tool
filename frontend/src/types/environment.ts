export type EnvironmentType = 'local' | 'aws' | 'cloud';

export interface PAEnvironmentBase {
  id: string;
  name: string; // display name to differentiate connections
  type: EnvironmentType;
  createdAt: string;
}

export interface LocalEnvironment extends PAEnvironmentBase {
  type: 'local';
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
}

export interface AWSEnvironment extends PAEnvironmentBase {
  type: 'aws';
  serverName: string;
  dataCenter: string;
  tenant: string;
  apiKey: string;
}

export interface CloudEnvironment extends PAEnvironmentBase {
  type: 'cloud';
  connectionName: string;
  environmentName: string;
  serverName: string;
  tm1AutomationUsername: string;
  tm1AutomationPassword: string;
  camNamespace: string;
}

export type PAEnvironment = LocalEnvironment | AWSEnvironment | CloudEnvironment;

export interface MigratableObject {
  name: string;
  type: 'dimension' | 'cube' | 'process';
  selected: boolean;
}

export interface MigrationConfig {
  sourceId: string;
  targetId: string;
  objects: MigratableObject[];
}
