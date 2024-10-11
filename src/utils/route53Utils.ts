import { getEnvVariable } from "./dotenvUtils";

// TODO do I need this function? maybe getEnvVariable is enough
export function getHostedZoneId(): string | null {
  const hostedZoneId = getEnvVariable("HOSTED_ZONE_ID");
  if (!hostedZoneId) {
    console.error("HOSTED_ZONE_ID is not defined in environment variables.");
    return null;
  }
  return hostedZoneId;
}
