import { APIGatewayProxyHandler } from "aws-lambda";

import { processText } from "./common";

export const onHttpRequest: APIGatewayProxyHandler = async event => {
  let { text } = JSON.parse(event.body || '') || {}

  const { pageId, title } = await processText(text)

  return {
    statusCode: 200,
    body: JSON.stringify({ pageId, title }),
  };
}
