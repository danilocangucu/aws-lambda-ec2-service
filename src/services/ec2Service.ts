import AWS from "aws-sdk";
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
import {
  updateSubdomainWithApiGatewayUrl,
  updateSubdomainWithEC2Ip,
} from "./route53Service";

dotenv.config();

const ec2 = new AWS.EC2({ region: "eu-north-1" });

// TODO check error handling in the functions

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
          InstanceState.STOPPED,
          InstanceState.STOPPING,
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
  foundInstance: Instance | null,
  instanceState: InstanceState,
  amiKeyPair: AmiKeyPair,
  instanceType: InstanceType
) {
  if (foundInstance) {
    if (instanceState === InstanceState.START) {
      return handleInstanceAlreadyRunning(foundInstance);
    } else if (
      instanceState === InstanceState.STOP ||
      instanceState === InstanceState.TERMINATE ||
      instanceState === InstanceState.REBOOT ||
      instanceState === InstanceState.HIBERNATE
    ) {
      return handleExecuteStateToInstance(foundInstance, instanceState);
    }
  } else if (!foundInstance && instanceState === InstanceState.START) {
    return await handleStartNewInstance(amiKeyPair, instanceType);
  }

  return {
    statusCode: 400,
    body: "Invalid instance state or instance not found.",
  };
}

function handleInstanceAlreadyRunning(foundInstance: Instance) {
  console.log(
    `Instance already running: ${foundInstance.keyName} with IP: ${foundInstance.publicIp}`
  );
  return {
    statusCode: 409,
    body: {
      instanceId: foundInstance.instanceId,
      publicIp: foundInstance.publicIp,
    },
    message: `A ${foundInstance.keyName}'s instance is already running.`,
  };
}

async function handleExecuteStateToInstance(
  instance: Instance,
  state: InstanceState
) {
  const result = await executeStateToInstance(state, instance);

  if (state === InstanceState.STOP || state === InstanceState.TERMINATE) {
    console.log("Updating Route 53 with updateSubdomainWithApiGatewayUrl()");
    const updateResult = await updateSubdomainWithApiGatewayUrl(instance);
    if (!updateResult) {
      console.error(
        `Failed to update subdomain for ${instance.keyName} to API Gateway URL.`
      );
    }
  }

  return {
    statusCode: result ? 200 : 500,
    body: {
      instanceId: instance.instanceId,
      publicIp: instance.publicIp,
    },
    message: result
      ? `Instance ${instance.keyName} ${state.toLowerCase()}d successfully.`
      : `Failed to ${state.toLowerCase()} ${instance.keyName} instance.`,
  };
}

async function handleStartNewInstance(
  amiKeyPair: AmiKeyPair,
  instanceType: InstanceType
) {
  const readyInstance = await launchAndConfigureEC2Instance(
    amiKeyPair,
    instanceType
  );

  if (!readyInstance) {
    throw new Error("Failed to launch and configure the EC2 instance.");
  }

  return {
    statusCode: 200,
    body: {
      instanceId: readyInstance.instanceId,
      publicIp: readyInstance.publicIp,
    },
    message: `EC2 instance for ${readyInstance.keyName} launched successfully.`,
  };
}

async function launchAndConfigureEC2Instance(
  amiKeyPair: AmiKeyPair,
  instanceType: InstanceType
): Promise<Instance | null> {
  const instanceResponse = await startEC2Instance(amiKeyPair, instanceType);
  if (!instanceResponse) {
    console.error("Failed to start EC2 instance.");
    return null;
  }

  const createdInstance = convertAWSTypeToLocalEC2Instance(instanceResponse);
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

  const isUpdated = await updateSubdomainWithEC2Ip(readyInstance);
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
  const securityGroupId: string = process.env.SECURITY_GROUP_ID || "";

  const params = {
    ImageId: amiKeyPair.amiId,
    InstanceType: instanceType || InstanceType.T3MICRO,
    MinCount: 1,
    MaxCount: 1,
    KeyName: amiKeyPair.keyName,
    SecurityGroupIds: [securityGroupId],
  };
  const result = await ec2.runInstances(params).promise();

  return result.Instances?.[0];
}

async function executeStateToInstance(
  state: InstanceState,
  instance: Instance
): Promise<boolean> {
  if (!instance.instanceId) {
    throw new Error("Instance ID is required to modify an EC2 instance.");
  }

  const params = {
    InstanceIds: [instance.instanceId],
  };

  try {
    const actionMethod = state.toLowerCase() + "Instances";
    await (ec2[actionMethod as keyof AWS.EC2] as Function)(params).promise();
    console.log(
      `EC2 instance ${instance.keyName} ${state.toLowerCase()}d successfully.`
    );
    return true;
  } catch (error) {
    console.error(
      `Failed to ${state.toLowerCase()} EC2 instance ${instance.keyName}:`,
      error
    );
    return false;
  }
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
