import {
  startEC2Instance,
  tagEC2Instance,
  findEC2Instance,
} from "./services/ec2Service";
import { updateRoute53 } from "./services/route53Service";
import * as dotenv from "dotenv";
import { getEnvVariable, parseAmiKeyPairs } from "./utils/dotenv";
import { validate, eventSchema } from "./utils/validators";
import {
  convertAWSTypeToLocalEC2Instance,
  matchAmiKeyPair,
  waitForInstanceReady,
} from "./utils/ec2Utils";
import { EventPayload } from "./types/utilTypes";

dotenv.config();

exports.handler = async (event: EventPayload) => {
  try {
    validate(event, eventSchema);

    const { amiKeyPair, instanceType } = event;

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

    const foundEC2Instance = await findEC2Instance(matchedKeyPair);
    if (foundEC2Instance) {
      console.log(
        `Instance already running: ${foundEC2Instance.instanceId} with IP: ${foundEC2Instance.publicIp}`
      );
      return {
        statusCode: 204,
        body: `Instance already running: ${foundEC2Instance.instanceId} with IP: ${foundEC2Instance.publicIp}`,
      };
    }

    const ec2InstanceResponse = await startEC2Instance(
      matchedKeyPair,
      instanceType
    );
    if (!ec2InstanceResponse) {
      throw new Error("Failed to start EC2 instance.");
    }

    const createdInstance =
      convertAWSTypeToLocalEC2Instance(ec2InstanceResponse);
    if (!createdInstance) {
      throw new Error("Failed to convert EC2 instance response.");
    }

    const isTagged = await tagEC2Instance(createdInstance);
    if (!isTagged) {
      throw new Error("Failed to tag EC2 instance.");
    }

    const readyInstance = await waitForInstanceReady(createdInstance);
    if (!readyInstance) {
      throw new Error("Failed to wait for EC2 instance to be ready.");
    }

    const isUpdated = await updateRoute53(readyInstance);
    if (!isUpdated) {
      throw new Error("Failed to update Route 53 with the new IP address.");
    }

    return {
      statusCode: 200,
      body: `EC2 instance launched: ${readyInstance.instanceId} with IP: ${readyInstance.publicIp}`,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: `Error: ${(error as Error).message}`,
    };
  }
};
