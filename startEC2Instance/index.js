const {
  startEC2Instance,
  tagEC2Instance,
  getPublicIP,
  checkRunningInstance,
} = require("./services/ec2Service");
const { updateRoute53 } = require("./services/route53Service");
require("dotenv").config();

// TODO use TypeScript instead of JavaScript

const amiKeyPairs = process.env.AMI_KEY_PAIRS.split(",").map((pair) => {
  const [amiId, keyName] = pair.split(":");
  return { amiId, keyName };
});

exports.handler = async () => {
  try {
    // TODO get amiKeyPair from the event
    // TODO validate the amiKeyPair against the AMI_KEY_PAIRS environment variable

    const goldenrack = amiKeyPairs[0];
    const runningInstance = await checkRunningInstance(goldenrack);

    if (runningInstance) {
      console.log(
        `Instance already running: ${runningInstance.instanceId} with IP: ${runningInstance.publicIp}`
      );
      return {
        statusCode: 204,
        body: `Instance already running: ${runningInstance.instanceId} with IP: ${runningInstance.publicIp}`,
      };
    }

    // TODO pass the amiKeyPair to the startEC2Instance function
    const instanceId = await startEC2Instance();
    console.log(`Successfully started EC2 instance: ${instanceId}`);

    // TODO pass the key name to the tagEC2Instance function
    await tagEC2Instance(instanceId);

    const publicIp = await getPublicIP(instanceId);
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
      body: `Error: ${error.message}`,
    };
  }
};
