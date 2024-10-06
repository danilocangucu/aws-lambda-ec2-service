import { AmiKeyPair } from "../types/ec2Types";

export function getEnvVariable(envVar: string): string | undefined {
  return process.env[envVar];
}

export function getAmiKeyPairs(envVar: string): AmiKeyPair[] {
  const amiKeyPairsString = process.env[envVar];
  if (!amiKeyPairsString) {
    throw new Error(`${envVar} is not defined in environment variables.`);
  }

  return amiKeyPairsString.split(",").map((pair) => {
    const [amiId, keyName] = pair.split(":");
    if (!amiId || !keyName) {
      throw new Error(`Invalid format for ${envVar}: ${pair}`);
    }
    return { amiId, keyName };
  });
}

export function parseAmiKeyPairs(
  amiKeyPairsString: string
): AmiKeyPair[] | null {
  const keyPairs = amiKeyPairsString.split(",").map((pair) => {
    const [amiId, keyName] = pair.split(":");
    if (!amiId || !keyName) {
      return null;
    }
    return { amiId, keyName };
  });

  if (keyPairs.some((pair) => pair === null)) {
    return null;
  }

  return keyPairs as AmiKeyPair[];
}

export const matchAmiKeyPair = (
  amiKeyPairs: AmiKeyPair[],
  amiKeyPair: AmiKeyPair
): AmiKeyPair | undefined => {
  const matchedKeyPair = amiKeyPairs.find(
    (keyPair) =>
      keyPair.amiId === amiKeyPair.amiId &&
      keyPair.keyName === amiKeyPair.keyName
  );

  return matchedKeyPair;
};
