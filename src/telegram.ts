import http from "serverless-http";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import Axios from "axios";

import { processText, processTextAndFiles, uploadToS3 } from "./common";

const bot = new Telegraf(process.env.TG_BOT_TOKEN!);


const processTgFileId = async (ctx: any, fileId: string, filename: string, contentType: string, text: string) => {
    const postfix = getForwardedPostfix(ctx)
    const tgFileUrl = await bot.telegram.getFileLink(fileId)
    const resp = await Axios.get<ArrayBuffer>(tgFileUrl.href, { responseType: 'arraybuffer' })


    const file = await uploadToS3(filename, contentType, Buffer.from(resp.data))
    const { title } = await processTextAndFiles(postfix ? `${text} ${postfix}` : text, [file])

    ctx.reply(`Got it!\n\n${title}`)
}

const getForwardedPostfix = (ctx: any) => {
    if (ctx.message.forward_from && ctx.message.forward_from.id !== ctx.message.from.id) {
        let name = ctx.message.forward_from.first_name

        if (ctx.message.forward_from.last_name) {
            name += ` ${ctx.message.forward_from.last_name}`
        }

        if (ctx.message.forward_from.username) {
            name += ` (@${ctx.message.forward_from.username})`
        }
        return `Forwarded from telegram ${name}`
    }

    if (ctx.message.forward_from_chat) {
        let name = ctx.message.forward_from_chat.title

        if (ctx.message.forward_from_message_id) {
            name += ` (https://t.me/c/${ctx.message.forward_from_chat.id}/${ctx.message.forward_from_message_id})`
        }

        return `Forwarded from telegram ${name}`
    }

    if (ctx.message.forward_sender_name) {
        return `Forwarded from telegram ${ctx.message.forward_sender_name}`
    }

    return ''
}




bot.on(message('document'), async ctx => {
    const filename = ctx.message.document.file_name || 'file'
    const text = ctx.message.caption || filename
    const postfix = getForwardedPostfix(ctx)
    const contentType = ctx.message.document.mime_type || 'application/octet-stream'
    await processTgFileId(ctx, ctx.message.document.file_id, filename, contentType, postfix ? `${text} ${postfix}` : text)
});

bot.on(message('photo'), async ctx => {
    const filename = 'Telegram Photo'
    const text = ctx.message.caption || filename
    const contentType = 'image/jpeg'

    const photo = ctx.message.photo[ctx.message.photo.length - 1]

    await processTgFileId(ctx, photo.file_id, filename, contentType, text)
});

bot.on(message('video'), async ctx => {
    const filename = ctx.message.video.file_name || 'Telegram Video'
    const text = ctx.message.caption || filename
    const contentType = 'video/mp4'

    await processTgFileId(ctx, ctx.message.video.file_id, filename, contentType, text)
});

bot.on(message('audio'), async ctx => {
    const filename = ctx.message.audio.title || ctx.message.audio.file_name || 'Telegram Audio'
    const text = ctx.message.caption || filename
    const contentType = 'audio/mpeg'

    await processTgFileId(ctx, ctx.message.audio.file_id, filename, contentType, text)
});

bot.on(message('voice'), async ctx => {
    const filename = 'Telegram Voice'
    const text = ctx.message.caption || filename
    const contentType = ctx.message.voice.mime_type || 'audio/ogg'

    await processTgFileId(ctx, ctx.message.voice.file_id, filename, contentType, text)
});

bot.on(message('sticker'), async ctx => {
    const filename = 'Telegram Sticker'
    const text = filename
    const contentType = 'image/webp'

    await processTgFileId(ctx, ctx.message.sticker.file_id, filename, contentType, text)
});

bot.on(message('text'), async ctx => {
    const { title } = await processText(ctx.message.text)
    ctx.reply(`Got it!\n\n${title}`)
});

export const handler = http(bot.webhookCallback('/telegram'));

//echo curl --request POST --url https://api.telegram.org/bot${TOKEN}/setWebhook --header 'content-type: application/json' --data "{\"url\": \"${endpoint}\"}"