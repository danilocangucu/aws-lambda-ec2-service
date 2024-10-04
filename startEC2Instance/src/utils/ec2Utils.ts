import { EC2 } from "aws-sdk";
import {
  AmiKeyPair,
  EC2Instance,
  EC2InstanceStatus,
  InstanceType,
} from "../types/ec2Types";
import { findEC2Instance } from "../services/ec2Service";

export const matchAmiKeyPair = (
  amiKeyPairs: AmiKeyPair[],
  amiKeyPair: AmiKeyPair
): AmiKeyPair | undefined => {
  const matchedKeyPair = amiKeyPairs.find(
    (keyPair) =>
      keyPair.amiId === amiKeyPair.amiId &&
      keyPair.keyName === amiKeyPair.keyName
  );

  return matchedKeyPair;
};

export const convertAWSTypeToLocalEC2Instance = (
  response: EC2.Instance
): EC2Instance | null => {
  if (!response.InstanceId || !response.ImageId || !response.KeyName) {
    console.error("Missing required fields in EC2 instance response");
    return null;
  }

  return {
    amiId: response.ImageId,
    keyName: response.KeyName,
    instanceId: response.InstanceId,
    publicIp: response.PublicIpAddress || "N/A",
    status: response.State?.Name as EC2InstanceStatus,
    instanceType:
      (response.InstanceType as InstanceType) || InstanceType.T3MICRO,
  };
};

const MAX_RETRIES = 50;
const RETRY_DELAY = 500;

export async function waitForInstanceReady(
  instance: EC2Instance
): Promise<EC2Instance | null> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    const amiKeyPair = { amiId: instance.amiId, keyName: instance.keyName };
    const foundInstance = await findEC2Instance(amiKeyPair);

    if (
      foundInstance &&
      foundInstance.status === "running" &&
      foundInstance.publicIp !== "N/A"
    ) {
      return foundInstance;
    }

    console.log(`Waiting for instance to be ready... Attempt ${retries + 1}`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    retries++;
  }

  console.log(
    "Max retries reached. EC2 instance did not become ready in time."
  );
  return null;
}

