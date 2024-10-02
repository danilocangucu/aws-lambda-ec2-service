import Joi from "joi";

export const eventSchema = Joi.object({
  amiKeyPair: Joi.object({
    amiId: Joi.string().required().label("AMI ID"),
    keyName: Joi.string().required().label("Key Name"),
  })
    .required()
    .label("AMI Key Pair"),
});

export const validate = (data: any, schema: Joi.ObjectSchema) => {
  console.log(`data: ${JSON.stringify(data)}`);
  const { error } = schema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
};