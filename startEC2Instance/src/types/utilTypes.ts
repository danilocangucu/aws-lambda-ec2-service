import { InstanceState, InstanceType } from "./ec2Types";

export interface EventPayload {
  amiKeyPair: {
    amiId: string;
    keyName: string;
  };
  instanceType: InstanceType;
  instanceState: InstanceState;
}
