import AWS from "aws-sdk";
import { Instance } from "../types/ec2Types";
import { getEnvVariable } from "../utils/dotenvUtils";

const domainUrl = "danilocangucu.net";

export async function updateRoute53(ec2instance: Instance): Promise<boolean> {
  const route53 = new AWS.Route53();

  const hostedZoneId = getEnvVariable("HOSTED_ZONE_ID");
  if (!hostedZoneId) {
    console.error("HOSTED_ZONE_ID is not defined in environment variables.");
    return false;
  }

  const route53Params = {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: `${ec2instance.keyName}.${domainUrl}`,
            Type: "A",
            TTL: 60,
            ResourceRecords: [{ Value: ec2instance.publicIp }],
          },
        },
      ],
    },
  };

  try {
    await route53.changeResourceRecordSets(route53Params).promise();
    return true;
  } catch (error) {
    console.error("Failed to update Route 53:", error);
    return false;
  }
}

