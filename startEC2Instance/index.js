const AWS = require('aws-sdk');
const ec2 = new AWS.EC2({ region: 'eu-north-1' });
const route53 = new AWS.Route53();
require('dotenv').config();

const amiId = process.env.AMI_ID;
const instanceType = process.env.INSTANCE_TYPE;
const keyName = process.env.KEY_NAME;
const securityGroupIds = [process.env.SECURITY_GROUP_ID];
const hostedZoneId = process.env.HOSTED_ZONE_ID;
const dnsName = process.env.DNS_NAME;

exports.handler = async (event) => {
    try {
        const instanceId = await startEC2Instance();
        console.log(`Successfully started EC2 instance: ${instanceId}`);
        
        await tagEC2Instance(instanceId);
        
        const publicIp = await getPublicIP(instanceId);
        console.log(`Public IP of the instance: ${publicIp}`);

        await updateRoute53(publicIp);
        console.log('Updated Route 53 with new IP address.');

        return {
            statusCode: 200,
            body: `EC2 instance launched: ${instanceId} with IP: ${publicIp}`,
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: `Error: ${error.message}`,
        };
    }
};

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
    await ec2.createTags({
        Resources: [instanceId],
        Tags: [{ Key: 'Name', Value: keyName }],
    }).promise();
}

async function getPublicIP(instanceId) {
    const instanceDetails = await ec2.describeInstances({ InstanceIds: [instanceId] }).promise();
    return instanceDetails.Reservations[0].Instances[0].PublicIpAddress;
}

async function updateRoute53(publicIp) {
    const route53Params = {
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
            Changes: [
                {
                    Action: 'UPSERT',
                    ResourceRecordSet: {
                        Name: dnsName,
                        Type: 'A',
                        TTL: 60,
                        ResourceRecords: [{ Value: publicIp }],
                    },
                },
            ],
        },
    };
    await route53.changeResourceRecordSets(route53Params).promise();
}
