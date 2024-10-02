import { AmiKeyPair } from "../types/ec2Types";

export const matchAmiKeyPair = (
  amiKeyPairs: AmiKeyPair[],
  amiKeyPair: AmiKeyPair
): AmiKeyPair | never => {
  const matchedKeyPair = amiKeyPairs.find(
    (keyPair) =>
      keyPair.amiId === amiKeyPair.amiId &&
      keyPair.keyName === amiKeyPair.keyName
  );

  if (!matchedKeyPair) {
    throw new Error("Invalid AMI key pair.");
  }

  return matchedKeyPair;
};
