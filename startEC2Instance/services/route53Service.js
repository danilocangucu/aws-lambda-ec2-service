const AWS = require("aws-sdk");
const route53 = new AWS.Route53();

const hostedZoneId = process.env.HOSTED_ZONE_ID;
const dnsName = process.env.DNS_NAME;

async function updateRoute53(publicIp) {
  const route53Params = {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: dnsName,
            Type: "A",
            TTL: 60,
            ResourceRecords: [{ Value: publicIp }],
          },
        },
      ],
    },
  };
  await route53.changeResourceRecordSets(route53Params).promise();
}

module.exports = {
  updateRoute53,
};
