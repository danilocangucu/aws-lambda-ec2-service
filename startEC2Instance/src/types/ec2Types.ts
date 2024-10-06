export interface AmiKeyPair {
  amiId: string;
  keyName: string;
}

export enum InstanceState {
  START = "start",
  STOP = "stop",
  REBOOT = "reboot",
  HIBERNATE = "hibernate",
  TERMINATE = "terminate",
  RUNNING = "running",
  STOPPED = "stopped",
  TERMINATING = "terminating",
  TERMINATED = "terminated",
  PENDING = "pending",
  SHUTTING_DOWN = "shutting-down",
}

export enum InstanceType {
  T3MICRO = "t3.micro",
}

export interface Instance extends AmiKeyPair {
  status: InstanceState;
  instanceId: string;
  publicIp: string;
  instanceType: InstanceType;
}
