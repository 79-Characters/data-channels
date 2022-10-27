import { AgentWalrus } from "@agent-walrus/agent-walrus";
import TwilioVideo from "twilio-video";
import { DataPacket_Kind, Room, RoomEvent } from "livekit-client";

let sendingData = false;
let track;
let messagesSent = 0;
let messagesReceived = new Set();
let messagesOOO = 0;
let maxIndex = -1;
let duplicateMessages = 0;
let delayBuffer = [];

let stateElem;
let messagesSentElem;
let messagesReceivedElem;
let messagesDroppedElem;
let messagesOOOElem;
let messagesDuplicatedElem;
let messagesMaxReceivedIndexElem;
let messageTimeElem;
let messageSizeElem;
let messageDelayElem;
let messageMaxDelayElem;

window.main = function main() {
    document.getElementById("start-sending-data").onclick = toggleSendingData;
    document.getElementById("connect").onclick = connect;

    stateElem = document.getElementById("state");
    messagesSentElem = document.getElementById("messages-sent");
    messagesReceivedElem = document.getElementById("messages-received");
    messagesDroppedElem = document.getElementById("messages-dropped");
    messagesOOOElem = document.getElementById("messages-ooo");
    messagesDuplicatedElem = document.getElementById("messages-duplicated");
    messagesMaxReceivedIndexElem = document.getElementById("messages-max-received-index");
    messageTimeElem = document.getElementById("message-time");
    messageSizeElem = document.getElementById("message-size");
    messageDelayElem = document.getElementById("message-delay");
    messageMaxDelayElem = document.getElementById("message-delay-max");
}

async function connect() {
    AgentWalrus.init(process.env.AGENT_WALRUS_TOKEN, { gatewayUrl: "https://gateway.staging.agentwalrus.io/api/v1/events/" });

    const roomNameInput = document.getElementById("room-name");
    const platformInput = document.getElementById("platform");

    const roomName = roomNameInput.value;
    const platform = platformInput.value;

    const name = makeRandomString(12);

    updateState("Fetching token...");
    const token = await fetchToken(roomName, name, platform);

    switch (platform) {
        case "twilio":
            updateState("Connecting to Twilio...");
            connectTwilioData(roomName, token);
            updateState(`Connected to Twilio (room ${roomName})`);
            break;
        case "livekit":
            updateState("Connecting to LiveKit...");
            connectLiveKitData(roomName, token);
            updateState(`Connected to LiveKit (room ${roomName})`);
            break;
    }

}

function toggleSendingData() {
    const elem = document.getElementById("start-sending-data");
    if (sendingData) {
        stopSendingData();
        elem.innerText = "Start Sending Data";
    } else {
        startSendingData();
        elem.innerText = "Stop Sending Data";
    }
}

function makeRandomString(len) {
    return (Math.random() + 1).toString(36).substring(7)
}

async function fetchToken(room, name, platform) {
    let endpoint;
    switch (platform) {
        case "twilio":
            endpoint = "twilio_token";
            break;
        case "livekit":
            endpoint = "livekit_token";
            break;
    }

    const url = `http://localhost:3001/${endpoint}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ room: room, name: name })
    });
    const json = await (response.json());
    return json.token;
}

function handleReceiveMessage(data) {
    let [index, ts] = data.split("-");
    index = parseInt(index);
    ts = parseInt(ts);
    const delay = Date.now() - ts;

    console.log(`r: ${index}`);

    if (messagesReceived.has(index)) {
        duplicateMessages += 1;
        updateMessagesDuplicated(duplicateMessages);
    } else {
        if (index < (maxIndex + 1)) {
            messagesOOO += 1;
            updateMessagesOOO(messagesOOO);
        }

        if (index > maxIndex) {
            maxIndex = index;
            updateMessagesMaxReceivedIndex(index);
        }
    }

    messagesReceived.add(index);
    updateMessagesReceived(messagesReceived.size);
    updateMessagesDropped(maxIndex - messagesReceived.size + 1);


    updateMessageDelay(delay);

    if (delayBuffer.length === 50) {
        delayBuffer.shift();
    }

    delayBuffer.push(delay);

    updateMessageMaxDelay(Math.max(...delayBuffer));
}

async function connectTwilioData(room, token) {
    const dataTrack = new TwilioVideo.LocalDataTrack();
    const r = await TwilioVideo.connect(token, {
        name: room,
        tracks: [dataTrack],
    });

    r.on("participantConnected", (participant) => {
        participant.on("trackSubscribed", (track) => {
            if (track.kind === "data") {
                track.on("message", handleReceiveMessage);
            }
        });
    })

    r.on("trackPublished", (publication) => {
        if (publication.track?.kind === "data") {
            track.on("message", handleReceiveMessage);
        }
    });

    r.participants.forEach(participant => {
        participant.on("trackSubscribed", (track) => {
            if (track.kind === "data") {
                track.on("message", handleReceiveMessage);
            }
        });
    })

    AgentWalrus.monitorPlatform("twilio", r);

    track = dataTrack;
}

async function connectLiveKitData(roomName, token) {
    const room = new Room({});
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    room.on(RoomEvent.DataReceived, (payload) => {
        handleReceiveMessage(decoder.decode(payload));
    })

    await room.connect(process.env.LIVEKIT_WS_URL, token);

    track = {
        send: (message) => {
            room.localParticipant.publishData(encoder.encode(message), DataPacket_Kind.RELIABLE);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startSendingData() {
    sendingData = true;

    while (sendingData) {
        const metadata = `${messagesSent}-${Date.now()}-`;
        let payloadLen = parseInt(messageSizeElem.value) - metadata;
        if (payloadLen < 0) {
            payloadLen = 0;
        }

        track.send(metadata.padEnd(payloadLen, "a"));
        console.log(`s: ${messagesSent}`);
        if (!sendingData) {
            break;
        }
        messagesSent += 1;
        updateMessagesSent(messagesSent);

        await sleep(parseInt(messageTimeElem.value));
    }
}

function stopSendingData() {
    sendingData = false;
}

function updateState(state) {
    stateElem.innerText = state;
}

function updateMessagesSent(value) {
    messagesSentElem.innerText = value;
}

function updateMessagesReceived(value) {
    messagesReceivedElem.innerText = value;
}

function updateMessagesDropped(value) {
    messagesDroppedElem.innerText = value;
}

function updateMessagesOOO(value) {
    messagesOOOElem.innerText = value;
}

function updateMessagesDuplicated(value) {
    messagesDuplicatedElem.innerText = value;
}

function updateMessagesMaxReceivedIndex(value) {
    messagesMaxReceivedIndexElem.innerText = value;
}

function updateMessageDelay(value) {
    messageDelayElem.innerText = value;
}

function updateMessageMaxDelay(value) {
    messageMaxDelayElem.innerText = value;
}
