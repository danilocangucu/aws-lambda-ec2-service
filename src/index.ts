import { findEC2Instance, handleInstanceState } from "./services/ec2Service";
import * as dotenv from "dotenv";
import { validateAndExtractEventData } from "./utils/ec2Utils";
import { parseJSONBody } from "./utils/validators";

dotenv.config();

exports.handler = async (event: any) => {
  try {
    const requestBody = parseJSONBody(event.body);

    const { amiKeyPair, instanceType, instanceState } =
      validateAndExtractEventData(requestBody);

    const foundInstance = await findEC2Instance(amiKeyPair);

    return await handleInstanceState(
      foundInstance,
      instanceState,
      amiKeyPair,
      instanceType
    );
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: `Error: ${(error as Error).message}`,
    };
  }
};
