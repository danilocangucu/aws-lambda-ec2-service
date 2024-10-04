import AWS, { EC2 } from "aws-sdk";
import dotenv from "dotenv";
import {
  AmiKeyPair,
  EC2Instance,
  EC2InstanceStatus,
  InstanceType,
} from "../types/ec2Types";
import { convertAWSTypeToLocalEC2Instance } from "../utils/ec2Utils";

dotenv.config();

const ec2 = new AWS.EC2({ region: "eu-north-1" });

export async function findEC2Instance(
  amiKeyPair: AmiKeyPair,
  ec2InstanceStatus?: EC2InstanceStatus[]
): Promise<EC2Instance | null> {
  const params = {
    Filters: [
      { Name: "image-id", Values: [amiKeyPair.amiId] },
      {
        Name: "instance-state-name",
        Values: ec2InstanceStatus || [
          EC2InstanceStatus.RUNNING,
          EC2InstanceStatus.PENDING,
        ],
      },
      { Name: "key-name", Values: [amiKeyPair.keyName] },
    ],
  };

  const result = await ec2.describeInstances(params).promise();
  if (!result.Reservations || result.Reservations.length === 0) {
    return null;
  }

  const instance = result.Reservations[0].Instances?.[0];
  if (instance?.InstanceId && instance?.PublicIpAddress) {
    return convertAWSTypeToLocalEC2Instance(instance);
  }

  return null;
}

export async function startEC2Instance(
  amiKeyPair: AmiKeyPair,
  instanceType: InstanceType
) {
  const securityGroupIds: string[] = [process.env.SECURITY_GROUP_ID || ""];

  const params = {
    ImageId: amiKeyPair.amiId,
    InstanceType: instanceType || InstanceType.T3MICRO,
    MinCount: 1,
    MaxCount: 1,
    KeyName: amiKeyPair.keyName,
    SecurityGroupIds: securityGroupIds,
  };
  const result = await ec2.runInstances(params).promise();

  return result.Instances?.[0];
}

export async function tagEC2Instance(
  ec2Instance: EC2Instance
): Promise<boolean> {
  if (!ec2Instance.instanceId) {
    console.error("EC2 instance ID is missing.");
    return false;
  }

  try {
    await ec2
      .createTags({
        Resources: [ec2Instance.instanceId],
        Tags: [{ Key: "Name", Value: ec2Instance.keyName }],
      })
      .promise();
    return true;
  } catch (error) {
    console.error("Failed to tag EC2 instance:", error);
    return false;
  }
}


