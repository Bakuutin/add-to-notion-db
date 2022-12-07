import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";

import { processText, getOrCreateTagId, notion, uploadToS3, processTextAndFiles } from "./common";

import { parse as parseForm } from 'lambda-multipart-parser'


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


export const onJSON = async (data: any) => {
  const handler = ACTIONS[data.action || DEFAULT_ACTION]
  return await handler(data)
}

export const onHttpRequest: APIGatewayProxyHandler = async event => {
  const contentType = event.headers['content-type'] || ''

  if (contentType.startsWith('application/json')) {
    const data = JSON.parse(event.body || '') || {}
    return await onJSON(data)
  }

  if (contentType.startsWith('text/plain')) {
    const text = event.body || ''
    return await onJSON({ text })
  }

  if (contentType.startsWith('multipart/form-data')) {
    return await onFormData(event)
  }
}

/**
 * Upload file to S3 and add it to Notion
 */
export const onFormData = async (event: APIGatewayProxyEvent) => {
  let { files, text } = await parseForm(event)

  const fileUrls = await Promise.all(files.map(async ({ filename, contentType, content }) => {
    return await uploadToS3(filename, contentType, content)
  }))

  if (!text) {
    text = files.map(file => file.filename).join(' ')
  }

  return await processTextAndFiles(text, fileUrls)
}