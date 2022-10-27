# Running locally

Install the dependencies:
`npm i`

Build browser bundle:
`npm run build`

Create `.env` file in `./src` with the following content:

```
TWILIO_ACCOUNT_SID=<Your Twilio account's SID>
TWILIO_API_KEY=<Your Twilio API key>
TWILIO_API_SECRET=<Your Twilio API secret>
AGENT_WALRUS_TOKEN=<Your Agent Walrus token>
LIVEKIT_WS_URL=<Your LiveKit URL>
LIVEKIT_API_KEY=<Your LiveKit API key>
LIVEKIT_SECRET_KEY=<Your LiveKit secret key>
```
