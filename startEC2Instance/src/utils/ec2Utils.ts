import { EC2 } from "aws-sdk";
import {
  AmiKeyPair,
  EC2Instance,
  EC2InstanceStatus,
  InstanceType,
} from "../types/ec2Types";

export const matchAmiKeyPair = (
  amiKeyPairs: AmiKeyPair[],
  amiKeyPair: AmiKeyPair
): AmiKeyPair | never => {
  const matchedKeyPair = amiKeyPairs.find(
    (keyPair) =>
      keyPair.amiId === amiKeyPair.amiId &&
      keyPair.keyName === amiKeyPair.keyName
  );

  if (!matchedKeyPair) {
    throw new Error("Invalid AMI key pair.");
  }

  return matchedKeyPair;
};

export const convertAWSTypeToLocalEC2Instance = (
  response: EC2.Instance
): EC2Instance => {
  return {
    amiId: response.ImageId!,
    keyName: response.KeyName!,
    instanceId: response.InstanceId!,
    publicIp: response.PublicIpAddress!,
    status: response.State?.Name as EC2InstanceStatus,
    instanceType: response.InstanceType! as InstanceType,
  };
};
