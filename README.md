# Post to notion database lambda

This is a cloud function that listens for POST requests and creates records in Notion database.

I use it for my personal GTD, it creates records in my inbox.

My usecases:

- When I double-tap back of my phone, Apple shortcut asks for input and sends it to inbox
- Telegram bot forwards to inbox anything I send to it
- Hotkey `<super>+i` promts for input and... You get it. Sends it to inbox.

Tweak this tool to your own needs. It suits my specific usecases, not yours.

## Usage

You will need aws-cli and serverless installed.

Copy the config example and edit it in your favorite text editor.

```bash
cp config.example.yaml config.yaml
```

Deployment is pretty straightforward

```bash
serverless deploy
```

Note: Keep your url in secret!

## Roadmap

- Auto-set tags based on regexp from config
- Upload files to S3, attach files to the page
