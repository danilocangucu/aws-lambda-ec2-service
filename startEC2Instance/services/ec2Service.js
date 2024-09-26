const AWS = require("aws-sdk");
const ec2 = new AWS.EC2({ region: "eu-north-1" });
require("dotenv").config();

const amiKeyPairs = process.env.AMI_KEY_PAIRS.split(",").map((pair) => {
  const [amiId, keyName] = pair.split(":");
  return { amiId, keyName };
});

const amiId = amiKeyPairs[0].amiId;
const keyName = amiKeyPairs[0].keyName;

const instanceType = process.env.INSTANCE_TYPE;
const securityGroupIds = [process.env.SECURITY_GROUP_ID];

async function checkRunningInstance(ec2Instance) {
  const params = {
    Filters: [
      { Name: "image-id", Values: [ec2Instance.amiId] },
      { Name: "instance-state-name", Values: ["running", "pending"] },
      { Name: "key-name", Values: [ec2Instance.keyName] },
    ],
  };

  const result = await ec2.describeInstances(params).promise();
  const instance = result.Reservations[0]?.Instances[0];

  return instance
    ? {
        instanceId: instance.InstanceId,
        publicIp: instance.PublicIpAddress,
      }
    : null;
}

async function startEC2Instance() {
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
  return result.Instances[0].InstanceId;
}

async function tagEC2Instance(instanceId) {
  // TODO get the key name from the event
  await ec2
    .createTags({
      Resources: [instanceId],
      Tags: [{ Key: "Name", Value: keyName }],
    })
    .promise();
}

async function getPublicIP(instanceId) {
  const instanceDetails = await ec2
    .describeInstances({ InstanceIds: [instanceId] })
    .promise();
  return instanceDetails.Reservations[0].Instances[0].PublicIpAddress;
}

module.exports = {
  checkRunningInstance,
  startEC2Instance,
  tagEC2Instance,
  getPublicIP,
};
