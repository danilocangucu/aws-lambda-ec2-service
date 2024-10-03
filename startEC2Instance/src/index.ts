import {
  startEC2Instance,
  tagEC2Instance,
  getPublicIP,
  findEC2Instance,
} from "./services/ec2Service";
import { updateRoute53 } from "./services/route53Service";
import * as dotenv from "dotenv";
import { getAmiKeyPairs } from "./utils/dotenv";
import { validate, eventSchema } from "./utils/validators";
import {
  convertAWSTypeToLocalEC2Instance,
  matchAmiKeyPair,
} from "./utils/ec2Utils";
import { EC2Instance } from "./types/ec2Types";

dotenv.config();

exports.handler = async (event: any) => {
  try {
    validate(event, eventSchema);

    const { amiKeyPair, instanceType } = event;

    const amiKeyPairs = getAmiKeyPairs("AMI_KEY_PAIRS");

    const matchedKeyPair = matchAmiKeyPair(amiKeyPairs, amiKeyPair);

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

    const createdInstance: EC2Instance =
      convertAWSTypeToLocalEC2Instance(ec2InstanceResponse);

    console.log(
      `Successfully started EC2 instance: ${createdInstance.instanceId}`
    );

    await tagEC2Instance(createdInstance);

    const publicIp = await getPublicIP(createdInstance);

    if (!publicIp) {
      throw new Error("Failed to get public IP address.");
    }

    console.log(`Public IP of the instance: ${publicIp}`);

    await updateRoute53(publicIp);
    console.log("Updated Route 53 with new IP address.");

    return {
      statusCode: 200,
      body: `EC2 instance launched: ${createdInstance.instanceId} with IP: ${publicIp}`,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: `Error: ${(error as Error).message}`,
    };
  }
};
