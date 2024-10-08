import Joi from "joi";
import { InstanceType, InstanceState } from "../types/ec2Types";
import { EventPayload } from "../types/utilTypes";

export const eventSchema = Joi.object({
  amiKeyPair: Joi.object({
    amiId: Joi.string().required().label("AMI ID"),
    keyName: Joi.string().required().label("Key Name"),
  })
    .required()
    .label("AMI Key Pair"),
  instanceType: Joi.string()
    .valid(...Object.values(InstanceType))
    .optional()
    .label("Instance Type"),
  instanceState: Joi.string()
    .valid(...Object.values(InstanceState))
    .required()
    .label("Intance State"),
});

export const validate = (data: any, schema: Joi.ObjectSchema) => {
  const { error } = schema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
};

export function parseJSONBody(body: any): EventPayload {
  try {
    if (typeof body === "string") {
      return JSON.parse(body) as EventPayload;
    } else if (typeof body === "object") {
      return body as EventPayload;
    } else {
      throw new Error(
        "Invalid body format: body must be a string or an object."
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error parsing JSON body: ${error.message}`);
    } else {
      throw new Error("Error parsing JSON body: Unknown error");
    }
  }
}
