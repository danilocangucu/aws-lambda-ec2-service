export interface AmiKeyPair {
  amiId: string;
  keyName: string;
}

export enum EC2InstanceStatus {
  RUNNING = "running",
  STOPPED = "stopped",
  TERMINATING = "terminating",
  TERMINATED = "terminated",
  PENDING = "pending",
  SHUTTING_DOWN = "shutting-down",
}

export interface EC2Instance extends AmiKeyPair {
  status?: EC2InstanceStatus;
  instanceId?: string;
  publicIp?: string;
}
