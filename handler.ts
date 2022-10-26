import { Client } from "@notionhq/client";
import { APIGatewayProxyHandler } from "aws-lambda";
import { parse as parseHTML } from 'node-html-parser';
import Axios from "axios";

// Initializing a client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

interface Event {
  text: string;
}

const TITLE_LIMIT = 100


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

const URLExpr = new RegExp(/^https?:\/\/\S+$/ui);

/**
 * Checks if the text is a URL without any other text
 *
 * @example
 * isURL("https://google.com") // true
 * isURL("hello") // false
 * isURL("https://google.com hello") // false
 */
function isURL(text: string): boolean {
  return URLExpr.test(text)
}

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"


/**
 * if text is a URL, try to fetch it
 */
async function getTitle(text: string): Promise<string> {
  if (isURL(text)) {
    // fetch url and get html title
    // content-type: text/html
    // fake user-agent
    // on failure, return url

    try {
      const { data } = await Axios.get(text, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html",
        },
      })

      const title = parseHTML(data).querySelector('title')?.text?.trim()
      if (title) {
        return title
      }
    } catch (e) {}
  } else if(text) {
    return text.slice(0, TITLE_LIMIT)
  }
  return "Untitled"
}


export const main: APIGatewayProxyHandler = async event => {
  let { text }: Event = JSON.parse(event.body || '') || {}

  text = text.trim()

  const title = await getTitle(text)

  const pageId = await createPage(title)

  if (text.length > TITLE_LIMIT || isURL(text)) {
    // split paragraph onto blocks of max 1500 characters
    const paragraphs = text.split('\n').map(paragraph => paragraph.match(/.{1,1500}/g) || ['']).flat()

    await appendParagraphs(pageId, ...paragraphs)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ pageId }),
  };
}
