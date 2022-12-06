import { APIGatewayProxyHandler } from "aws-lambda";

import { processText, getOrCreateTagId, notion } from "./common";


/**
 * Remove tag "Inbox" from all pages that have it
 */
export const clearInbox = async () => {
  const inboxTagId = await getOrCreateTagId('Inbox')

  const { results } = await notion.databases.query({
    database_id: process.env.ITEMS_DATABASE_ID as string,
    filter: {
      property: 'Tags',
      relation: {
        contains: inboxTagId
      }
    }
  })

  for (const page of results as any[]) {
    const tagIds = page.properties.Tags.relation.map(({ id }) => id)

    await notion.pages.update({
      page_id: page.id,
      properties: {
        Tags: {
          type: 'relation',
          relation: tagIds.filter(id => id !== inboxTagId).map(id => ({ id }))
        }
      }
    })
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ removed: results.length }),
  };
}

export const addEntry = async ({text}) => {
  const { pageId, title } = await processText(text)

  return {
    statusCode: 200,
    body: JSON.stringify({ pageId, title }),
  };
}


const ACTIONS = {
  clearInbox,
  addEntry,
}

const DEFAULT_ACTION = 'addEntry'


export const onHttpRequest: APIGatewayProxyHandler = async event => {
  const data = JSON.parse(event.body || '') || {}
  const handler = ACTIONS[data.action || DEFAULT_ACTION]
  return await handler(data)
}
