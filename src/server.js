const express = require("express");
const cors = require("cors");
const https = require('https');
const twilio = require("twilio");
const LiveKit = require("livekit-server-sdk");

require('dotenv').config()

const port = 3001;
const app = express();

app.use(cors({ maxAge: 7200 }));

app.post("/twilio_token", express.json(), (req, res) => {
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioApiKey = process.env.TWILIO_API_KEY;
    const twilioApiSecret = process.env.TWILIO_API_SECRET;

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
        console.error("Missing env vars.");
        res.status(500).end();
        return;
    }

    const identity = req.body.name;
    const room = req.body.room;

    console.log(`Generating token for ${identity} ${room}`);

    const videoGrant = new VideoGrant({
        room: room
    });

    const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { identity: identity });
    token.addGrant(videoGrant);

    res.send({ token: token.toJwt() });
});

app.post("/daily_token", express.json(), (req, res) => {
    const room = req.body.room;

    let options = {
        host: 'api.daily.co',
        port: 443,
        path: '/v1/meeting-tokens',
        method: 'POST',
        headers: { "Authorization": `Bearer ${process.env.DAILY_API_KEY}` },
    };

    let apiReq = https.request(options, function (apiRes) {
        apiRes.setEncoding('utf8');
        apiRes.on('data', function (chunk) {
            res.send({ token: JSON.parse(chunk).token });
        });
    });

    apiReq.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    apiReq.write(`{"properties":{"room_name":"${room}"}}`);
    apiReq.end();
});


app.post("/livekit_token", express.json(), (req, res) => {
    const identity = req.body.name;
    const roomName = req.body.room;

    const at = new LiveKit.AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_SECRET_KEY, {
        identity: identity,
    });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    const token = at.toJwt();

    res.send({ token: token });
});


app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
