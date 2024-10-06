import Joi from "joi";
import { InstanceType, InstanceState } from "../types/ec2Types";

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
