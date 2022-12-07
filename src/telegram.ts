import http from "serverless-http";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

const bot = new Telegraf(process.env.TG_BOT_TOKEN!);

// echo
bot.on(message('text'), ctx => ctx.reply(ctx.message.text));


export const handler = http(bot.webhookCallback());


//curl --request POST --url https://api.telegram.org/bot${TOKEN}/setWebhook --header 'content-type: application/json' --data '{"url": "${endpoint}"}'