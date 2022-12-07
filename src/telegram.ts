import http from "serverless-http";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

import { processText } from "./common";

const bot = new Telegraf(process.env.TG_BOT_TOKEN!);

bot.on(message('text'), async ctx => {
    const { title } = await processText(ctx.message.text)
    ctx.reply(`Got it!\n\n${title}`)
});

export const handler = http(bot.webhookCallback('/telegram'));

//echo curl --request POST --url https://api.telegram.org/bot${TOKEN}/setWebhook --header 'content-type: application/json' --data "{\"url\": \"${endpoint}\"}"