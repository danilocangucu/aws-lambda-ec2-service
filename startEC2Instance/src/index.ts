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
import { matchAmiKeyPair } from "./utils/ec2Utils";

dotenv.config();

exports.handler = async (event: any) => {
  try {
    validate(event, eventSchema);

    const { amiKeyPair } = event;

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

    // TODO pass the amiKeyPair to the startEC2Instance function
    const instanceId = await startEC2Instance();

    if (!instanceId) {
      throw new Error("Failed to start EC2 instance.");
    }

    console.log(`Successfully started EC2 instance: ${instanceId}`);

    // TODO pass the key name to the tagEC2Instance function
    await tagEC2Instance(instanceId);

    const publicIp = await getPublicIP(instanceId);

    if (!publicIp) {
      throw new Error("Failed to get public IP address.");
    }

    console.log(`Public IP of the instance: ${publicIp}`);

    await updateRoute53(publicIp);
    console.log("Updated Route 53 with new IP address.");

    return {
      statusCode: 200,
      body: `EC2 instance launched: ${instanceId} with IP: ${publicIp}`,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: `Error: ${(error as Error).message}`,
    };
  }
};
