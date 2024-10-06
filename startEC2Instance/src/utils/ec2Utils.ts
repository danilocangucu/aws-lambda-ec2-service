import { EC2 } from "aws-sdk";
import {
  AmiKeyPair,
  Instance,
  InstanceState,
  InstanceType,
} from "../types/ec2Types";
import { findEC2Instance } from "../services/ec2Service";
import { validate, eventSchema } from "./validators";
import { EventPayload } from "../types/utilTypes";
import {
  getEnvVariable,
  matchAmiKeyPair,
  parseAmiKeyPairs,
} from "./dotenvUtils";

export function validateAndExtractEventData(event: EventPayload): {
  amiKeyPair: AmiKeyPair;
  instanceType: InstanceType;
  instanceState: InstanceState;
} {
  validate(event, eventSchema);

  const { amiKeyPair, instanceType, instanceState } = event;

  const amiKeyPairsString = getEnvVariable("AMI_KEY_PAIRS");
  if (!amiKeyPairsString) {
    throw new Error("AMI_KEY_PAIRS is not defined in environment variables.");
  }

  const amiKeyPairs = parseAmiKeyPairs(amiKeyPairsString);
  if (!amiKeyPairs) {
    throw new Error("Invalid format for AMI key pairs.");
  }

  const matchedKeyPair = matchAmiKeyPair(amiKeyPairs, amiKeyPair);
  if (!matchedKeyPair) {
    throw new Error("AMI key pair not found.");
  }

  return { amiKeyPair: matchedKeyPair, instanceType, instanceState };
}

export const convertAWSTypeToLocalEC2Instance = (
  response: EC2.Instance
): Instance | null => {
  if (!response.InstanceId || !response.ImageId || !response.KeyName) {
    console.error("Missing required fields in EC2 instance response");
    return null;
  }

  return {
    amiId: response.ImageId,
    keyName: response.KeyName,
    instanceId: response.InstanceId,
    publicIp: response.PublicIpAddress || "N/A",
    status: response.State?.Name as InstanceState,
    instanceType:
      (response.InstanceType as InstanceType) || InstanceType.T3MICRO,
  };
};

const MAX_RETRIES = 50;
const RETRY_DELAY = 500;

export async function waitForInstanceReady(
  instance: Instance
): Promise<Instance | null> {
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

