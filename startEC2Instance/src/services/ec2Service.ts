import AWS, { EC2 } from "aws-sdk";
import dotenv from "dotenv";
import {
  AmiKeyPair,
  Instance,
  InstanceState,
  InstanceType,
} from "../types/ec2Types";
import {
  convertAWSTypeToLocalEC2Instance,
  waitForInstanceReady,
} from "../utils/ec2Utils";
import { updateRoute53 } from "./route53Service";

dotenv.config();

const ec2 = new AWS.EC2({ region: "eu-north-1" });

export async function findEC2Instance(
  amiKeyPair: AmiKeyPair,
  ec2InstanceStatus?: InstanceState[]
): Promise<Instance | null> {
  const params = {
    Filters: [
      { Name: "image-id", Values: [amiKeyPair.amiId] },
      {
        Name: "instance-state-name",
        Values: ec2InstanceStatus || [
          InstanceState.RUNNING,
          InstanceState.PENDING,
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

export async function handleInstanceState(
  foundEC2Instance: Instance | null,
  instanceState: InstanceState,
  amiKeyPair: AmiKeyPair,
  instanceType: InstanceType
) {
  if (foundEC2Instance) {
    if (instanceState === InstanceState.START) {
      return handleInstanceAlreadyRunning(foundEC2Instance);
    } else if (instanceState === InstanceState.STOP) {
      return handleStopInstance(foundEC2Instance);
    }
  } else if (!foundEC2Instance && instanceState === InstanceState.START) {
    return await handleStartNewInstance(amiKeyPair, instanceType);
  }
  return {
    statusCode: 400,
    body: "Invalid instance state or instance not found.",
  };
}

function handleInstanceAlreadyRunning(foundEC2Instance: Instance) {
  console.log(
    `Instance already running: ${foundEC2Instance.instanceId} with IP: ${foundEC2Instance.publicIp}`
  );
  return {
    statusCode: 204,
    body: `Instance already running: ${foundEC2Instance.instanceId} with IP: ${foundEC2Instance.publicIp}`,
  };
}

async function handleStopInstance(foundEC2Instance: Instance) {
  console.log("Stopping EC2 instance...");
  // TODO implement stopping the instance;
  const stopResult = true;
  return {
    statusCode: stopResult ? 200 : 500,
    body: stopResult
      ? "Instance stopped successfully."
      : "Failed to stop the instance.",
  };
}

async function handleStartNewInstance(
  amiKeyPair: AmiKeyPair,
  instanceType: InstanceType
) {
  console.log("Starting new EC2 instance...");

  const readyInstance = await launchAndConfigureEC2Instance(
    amiKeyPair,
    instanceType
  );

  if (!readyInstance) {
    throw new Error("Failed to launch and configure the EC2 instance.");
  }

  return {
    statusCode: 200,
    body: `EC2 instance launched: ${readyInstance.instanceId} with IP: ${readyInstance.publicIp}`,
  };
}

async function launchAndConfigureEC2Instance(
  amiKeyPair: AmiKeyPair,
  instanceType: InstanceType
): Promise<Instance | null> {
  console.log("Starting new EC2 instance...");

  const ec2InstanceResponse = await startEC2Instance(amiKeyPair, instanceType);
  if (!ec2InstanceResponse) {
    console.error("Failed to start EC2 instance.");
    return null;
  }

  const createdInstance = convertAWSTypeToLocalEC2Instance(ec2InstanceResponse);
  if (!createdInstance) {
    console.error("Failed to convert EC2 instance response.");
    return null;
  }

  const isTagged = await tagEC2Instance(createdInstance);
  if (!isTagged) {
    console.error("Failed to tag EC2 instance.");
    return null;
  }

  const readyInstance = await waitForInstanceReady(createdInstance);
  if (!readyInstance) {
    console.error("Failed to wait for EC2 instance to be ready.");
    return null;
  }

  const isUpdated = await updateRoute53(readyInstance);
  if (!isUpdated) {
    console.error("Failed to update Route 53 with the new IP address.");
    return null;
  }

  return readyInstance;
}

async function startEC2Instance(
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

async function tagEC2Instance(ec2Instance: Instance): Promise<boolean> {
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


