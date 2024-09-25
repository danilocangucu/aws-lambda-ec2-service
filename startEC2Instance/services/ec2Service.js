const AWS = require("aws-sdk");
const ec2 = new AWS.EC2({ region: "eu-north-1" });

const amiId = process.env.AMI_ID;
const instanceType = process.env.INSTANCE_TYPE;
const keyName = process.env.KEY_NAME;
const securityGroupIds = [process.env.SECURITY_GROUP_ID];

async function startEC2Instance() {
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
  startEC2Instance,
  tagEC2Instance,
  getPublicIP,
};
