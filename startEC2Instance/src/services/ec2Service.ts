import AWS from "aws-sdk";
import dotenv from "dotenv";
import { getAmiKeyPairs } from "../utils/dotenv";
import { AmiKeyPair, EC2Instance, EC2InstanceStatus } from "../types/ec2Types";

dotenv.config();

const ec2 = new AWS.EC2({ region: "eu-north-1" });

const amiKeyPairs = getAmiKeyPairs("AMI_KEY_PAIRS");
const amiId: string = amiKeyPairs[0].amiId;
const keyName: string = amiKeyPairs[0].keyName;

const instanceType: string = process.env.INSTANCE_TYPE || "t3.micro";
const securityGroupIds: string[] = [process.env.SECURITY_GROUP_ID || ""];

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
    return {
      instanceId: instance.InstanceId,
      publicIp: instance.PublicIpAddress,
      amiId: instance.ImageId! || "",
      keyName: instance.KeyName! || "",
      status: instance.State?.Name as EC2InstanceStatus,
    };
  }

  return null;
}

export async function startEC2Instance() {
  // TODO get the AMI ID and key name from the event
  const params = {
    ImageId: amiId,
    InstanceType: instanceType,
    MinCount: 1,
    MaxCount: 1,
    KeyName: keyName,
    SecurityGroupIds: securityGroupIds,
  };
  const result = await ec2.runInstances(params).promise();

  const instance = result.Instances?.[0];
  if (!instance) {
    throw new Error("Failed to start EC2 instance");
  }

  return instance.InstanceId;
}

export async function tagEC2Instance(instanceId: string) {
  // TODO get the key name from the event
  await ec2
    .createTags({
      Resources: [instanceId],
      Tags: [{ Key: "Name", Value: keyName }],
    })
    .promise();
}

export async function getPublicIP(instanceId: string) {
  const instanceDetails = await ec2
    .describeInstances({ InstanceIds: [instanceId] })
    .promise();

  const instance = instanceDetails.Reservations?.[0]?.Instances?.[0];
  if (!instance) {
    throw new Error("Instance not found");
  }

  return instance.PublicIpAddress;
}
