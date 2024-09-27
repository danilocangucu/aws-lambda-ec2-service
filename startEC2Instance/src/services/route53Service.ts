import AWS from "aws-sdk";
import { getEnvVar } from "../utils/dotenv";
const route53 = new AWS.Route53();

const hostedZoneId = getEnvVar("HOSTED_ZONE_ID");
// TODO get the DNS name from the event via keyName
const dnsName = getEnvVar("DNS_NAME");

export async function updateRoute53(publicIp: string) {
  // TODO get the DNS name from the event
  const route53Params = {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: dnsName,
            Type: "A",
            TTL: 60,
            ResourceRecords: [{ Value: publicIp }],
          },
        },
      ],
    },
  };
  await route53.changeResourceRecordSets(route53Params).promise();
}
