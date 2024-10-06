import { findEC2Instance, handleInstanceState } from "./services/ec2Service";
import * as dotenv from "dotenv";
import { validateAndExtractEventData } from "./utils/ec2Utils";
import { EventPayload } from "./types/utilTypes";

dotenv.config();

exports.handler = async (event: EventPayload) => {
  try {
    const { amiKeyPair, instanceType, instanceState } =
      validateAndExtractEventData(event);
    const foundEC2Instance = await findEC2Instance(amiKeyPair);
    const response = await handleInstanceState(
      foundEC2Instance,
      instanceState,
      amiKeyPair,
      instanceType
    );

    return response;
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: `Error: ${(error as Error).message}`,
    };
  }
};
