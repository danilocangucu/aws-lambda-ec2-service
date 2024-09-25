const {
  startEC2Instance,
  tagEC2Instance,
  getPublicIP,
} = require("./services/ec2Service");
const { updateRoute53 } = require("./services/route53Service");
require("dotenv").config();

exports.handler = async () => {
  try {
    const instanceId = await startEC2Instance();
    console.log(`Successfully started EC2 instance: ${instanceId}`);

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
