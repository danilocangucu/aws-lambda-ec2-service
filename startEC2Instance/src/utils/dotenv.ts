export function getEnvVar(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`${varName} is not defined in environment variables.`);
  }
  return value;
}

// TODO add the AmiKeyPair in types file
interface AmiKeyPair {
  amiId: string;
  keyName: string;
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
