import AWS from "aws-sdk";
import { Instance } from "../types/ec2Types";
import { getEnvVariable } from "../utils/dotenvUtils";
import { getHostedZoneId } from "../utils/route53Utils";
import dotenv from "dotenv";

dotenv.config();

const domainUrl = "danilocangucu.net";
const route53 = new AWS.Route53();
const apiGatewayUrl = getEnvVariable("API_GATEWAY_URL");

// TODO request certificate via ACM for *.danilocangucu.net

export async function updateSubdomainWithEC2Ip(
  ec2instance: Instance
): Promise<boolean> {
  const hostedZoneId = getHostedZoneId();
  if (!hostedZoneId) {
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
    const result = await deleteDNSRecord(ec2instance, "CNAME");
    if (!result) {
      console.error("Failed to delete CNAME record.");
      return false;
    }
    await route53.changeResourceRecordSets(route53Params).promise();
    return true;
  } catch (error) {
    console.error("Failed to update Route 53:", error);
    return false;
  }
}

export async function updateSubdomainWithApiGatewayUrl(
  ec2instance: Instance
): Promise<boolean> {
  const hostedZoneId = getHostedZoneId();
  if (!hostedZoneId) {
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
            Type: "CNAME",
            TTL: 60,
            ResourceRecords: [{ Value: apiGatewayUrl || "" }],
          },
        },
      ],
    },
  };

  try {
    const result = await deleteDNSRecord(ec2instance, "A");
    if (!result) {
      console.error("Failed to delete A record.");
      return false;
    }
    console.log("Updating Route 53 with value:", apiGatewayUrl);
    await route53.changeResourceRecordSets(route53Params).promise();
    return true;
  } catch (error) {
    console.error("Failed to update Route 53:", error);
    return false;
  }
}

export async function getDNSRecordValue(
  ec2instance: Instance,
  recordType: "A" | "CNAME"
): Promise<string | null> {
  const hostedZoneId = getHostedZoneId();
  if (!hostedZoneId) {
    console.error("HOSTED_ZONE_ID is not defined.");
    return null;
  }

  const params = {
    HostedZoneId: hostedZoneId,
    StartRecordName: `${ec2instance.keyName}.${domainUrl}`,
    StartRecordType: recordType,
    MaxItems: "1",
  };

  try {
    const data = await route53.listResourceRecordSets(params).promise();
    const recordSet = data.ResourceRecordSets[0];

    if (recordSet && recordSet.Type === recordType) {
      if (recordSet.ResourceRecords && recordSet.ResourceRecords.length > 0) {
        return recordSet.ResourceRecords[0].Value;
      } else {
        console.error("ResourceRecords is undefined or empty.");
        return null;
      }
    } else {
      console.error("Record not found or type mismatch.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching DNS record value:", error);
    return null;
  }
}

export async function deleteDNSRecord(
  ec2instance: Instance,
  recordType: "A" | "CNAME"
): Promise<boolean> {
  const hostedZoneId = getHostedZoneId();
  if (!hostedZoneId) {
    console.error("HOSTED_ZONE_ID is not defined.");
    return false;
  }

  const recordValue = await getDNSRecordValue(ec2instance, recordType);
  if (!recordValue) {
    console.error("Failed to retrieve the record value for deletion.");
    return false;
  }

  const deleteRecordParams = {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "DELETE",
          ResourceRecordSet: {
            Name: `${ec2instance.keyName}.${domainUrl}`,
            Type: recordType,
            TTL: 60,
            ResourceRecords: [{ Value: recordValue }],
          },
        },
      ],
    },
  };

  try {
    await route53.changeResourceRecordSets(deleteRecordParams).promise();
    return true;
  } catch (error) {
    console.error(`Failed to delete ${recordType} record:`, error);
    return false;
  }
}
