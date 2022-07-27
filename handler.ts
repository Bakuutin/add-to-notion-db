import { Client } from "@notionhq/client";
import { APIGatewayProxyHandler } from "aws-lambda";

// Initializing a client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

interface Event {
  text: string;
}

const TITLE_LIMIT = 1500


async function appendParagraphs(pageId: string, ...texts: string[]) {
  await notion.blocks.children.append({
    block_id: pageId,
    children: texts.map(text => ({
        type: "paragraph",
        object: "block",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { "content": text },
            },
          ],
        },
      })),
  })
}

async function createPage(title: string) {
  const { id } = await notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID as string },
    properties: { Name: { title: [{ text: { content: title } }] } },
  })

  return id
}


export const main: APIGatewayProxyHandler = async event => {
  let { text }: Event = JSON.parse(event.body || '') || {}


  const title = text ? text.slice(0, TITLE_LIMIT) : new Date().toString();
  const pageId = await createPage(title)


  if (text.length > TITLE_LIMIT) {
    // split paragraph onto blocks of max 1500 characters
    const paragraphs = text.split('\n').map(paragraph => paragraph.match(/.{1,1500}/g) || ['']).flat()

    await appendParagraphs(pageId, ...paragraphs)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ pageId }),
  };
}
