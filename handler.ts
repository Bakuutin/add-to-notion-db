import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

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
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"

const TAG_MAP = new Map<string, string>()

// try import rules from ./rules.ts, default to empty array
let rules: Rule[] = []

try {
  rules = require('./rules').RULES
} catch (e) {
  console.log('No rules found')
}


async function getOrCreateTagId(name: string): Promise<string> {
    if (TAG_MAP.size === 0) {
        await fetchTags()
    }

    let cachedId = TAG_MAP.get(name)

    if (cachedId) {
        return cachedId
    }

    let { id } = await notion.pages.create({
        parent: { database_id: process.env.TAG_DATABASE_ID as string },
        properties: {
            Name: { title: [{ text: { content: name } }] },
        },
    })

    return id
}

async function fetchTags() {
    const resp: any = await notion.databases.query({
        database_id: process.env.TAG_DATABASE_ID as string,
        filter: {
            or: rules.map(rule => ({
                    property: 'Name',
                    title: {
                        equals: rule.tag
                    },
                })
            )
        },
    })

    TAG_MAP.clear()
    for(let tag of resp.results) {
        TAG_MAP.set(tag.properties.Name.title[0].text.content, tag.id)
    }
}


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

async function createPage(title: string, extraProperties?: any) {
  const properties = { Name: { title: [{ text: { content: title } }] } }

  if (extraProperties) {
    Object.assign(properties, extraProperties)
  }

  const { id } = await notion.pages.create({
    parent: { database_id: process.env.ITEMS_DATABASE_ID as string },
    properties,
  })

  return id
}

/**
 * Checks if the text is a URL without any other text
 *
 * @example
 * isURL("https://google.com") // true
 * isURL("hello") // false
 * isURL("https://google.com hello") // false
 */
function isURL(text: string): boolean {
  return /^https?:\/\/[^\s]+$/.test(text)
  // return urlRegexSafe({ exact: true }).test(text)
}


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

/**
* textTag is a string with words separated by the pipe character
* text is a plain text with words separated by spaces, newlines, punctuation, etc.
* return true if there is at least one word in textTag that is also in text, ignore case and punctuation
*/
function hasIntersection(text: string, textTag: string): boolean {
  const textTagWordsSet = new Set(textTag.split('|').map(word => word.toLowerCase()))
  const textWords = text.toLowerCase().split(/[\s,\.!?…@#$^&*()_+=%/]+/mui)

  return textTagWordsSet.size > 0 && textWords.some(word => textTagWordsSet.has(word))
}

function extractTagNames(text: string): string[] {
  const tags = new Set<string>()
  for (const rule of rules) {
    if (typeof rule.rule === 'string') {
      if (hasIntersection(text, rule.rule)) {
        tags.add(rule.tag)
      }
    } else if (rule.rule instanceof RegExp) {
      if (rule.rule.test(text)) {
        tags.add(rule.tag)
      }
    } else if (rule.rule instanceof Function) {
      if (rule.rule(text, isURL(text))) {
        tags.add(rule.tag)
      }
    }
  }
  return Array.from(tags)
}


export const main: APIGatewayProxyHandler = async event => {
  let { text }: Event = JSON.parse(event.body || '') || {}

  text = text.trim()

  const tagNames = extractTagNames(text)

  const tagIds = await Promise.all(tagNames.map(getOrCreateTagId))

  const title = await getTitle(text)

  const extraProperties = {}

  const allURLs = [...(text.match(/https?:\/\/[^\s]+/) || [])]

  if (allURLs.length) {
    extraProperties['URL'] = {
      type: 'url',
      url: allURLs[0]
    }
  }

  if (tagIds.length) {
    extraProperties['Tags'] = {
      type: 'relation',
      relation: tagIds.map(id => ({ id }))
    }
  }

  const pageId = await createPage(title, extraProperties)

  if (text.length > TITLE_LIMIT || isURL(text)) {
    // split paragraph onto blocks of max 1500 characters
    const paragraphs = text.split('\n').map(paragraph => paragraph.match(/.{1,1500}/g) || ['']).flat()

    await appendParagraphs(pageId, ...paragraphs)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ pageId, title }),
  };
}
