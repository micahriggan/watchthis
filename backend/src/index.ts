import * as util from "util";
import * as http from "http";
import * as request from "request-promise";
import moment from "moment";
import express from "express";
import cors from "cors";
import socket from "socket.io";
import { YTData } from "./YTData";

const app = express();
const server = http.createServer(app);
const IO = socket(server);
const YTKey = process.env.YT_SECRET;

const wait = util.promisify(setTimeout);

type QueueItem = {
  url: string;
  lengthMs: number;
  queuedAt: Date;
  ytData: YTData;
  startedPlaying?: Date;
};

type Queue = Array<QueueItem>;
type ChannelQueues = { [channel: string]: { q: Queue; nowPlaying?: number } };
const channels: ChannelQueues = {};

app.use(cors());
app.use(express.json());

app.post("/channel/:channelId", async (req, res) => {
  try {
    const url: string = req.body.url;
    const channelId = req.params.channelId;
    const split = url.split("v=");
    if (split.length < 2) {
      return res.status(500).send("No video ID found in url");
    }
    const id = split[1].split("&")[0];
    const ytApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${YTKey}&part=snippet,contentDetails,statistics,status`;

    const ytData = (await request.get(ytApiUrl, { json: true })) as YTData;

    if (!channels[channelId]) {
      channels[req.params.channelId] = {
        q: new Array<QueueItem>()
      };
    }
    const lengthMs = moment
      .duration(ytData.items[0].contentDetails.duration)
      .asMilliseconds();

    const newItem = {
      url,
      lengthMs,
      queuedAt: new Date(),
      ytData
    };
    channels[channelId].q.push(newItem);

    IO.sockets.in(channelId).emit("new", newItem);

    return res.send(channels[channelId]);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.get("/channel/:channelId", (req, res) => {
  const channelId = req.params.channelId;
  res.send(channels[channelId]);
});

app.get("/channel", (req, res) => {
  const channelId = req.params.channelId;
  res.send(Object.keys(channels));
});

server.listen(8000, () => {
  console.log("watchthis server listening on port", 8000);
});

IO.on("connect", client => {
  client.on("join", room => {
    console.log(room, "Client joined");
    client.leaveAll();
    client.join(room);
    const channel = channels[room];
    if (channel && channel.nowPlaying !== undefined) {
      console.log(room, "Telling new client to play", channel.nowPlaying);
      client.emit("play", channel.q[channel.nowPlaying]);
    }
  });
  const skipVotes = {};
  client.on("skip", channel => {
    if (!skipVotes[channel]) {
      skipVotes[channel] = {};
    }
    skipVotes[channel][client.id] = true;
    if (
      Object.keys(skipVotes[channel]).length >=
      IO.sockets.in(channel).clients.length
    ) {
      skipVotes[channel] = {};
      startQueueItem(channel, channels[channel].nowPlaying + 1);
    }
  });
});

async function startQueueItem(channelName: string, queueIndex: number = 0) {
  const channel = channels[channelName];
  if (channel.q[queueIndex]) {
    channel.nowPlaying = queueIndex;
    channel.q[queueIndex].startedPlaying = new Date();
    console.log(channelName, "Telling all clients to play", queueIndex);
    IO.sockets.in(channelName).emit("play", channel.q[queueIndex]);
    console.log(channelName, "Playing video", queueIndex);
    wait(channel.q[queueIndex].lengthMs).then(() => {
      if (channel.nowPlaying === queueIndex) {
        console.log(channelName, "Ending", queueIndex);
        startQueueItem(channelName, queueIndex + 1);
      }
    });
  } else {
    channel.nowPlaying = undefined;
  }
}
async function startIfNonePlaying() {
  for (const room of Object.keys(channels)) {
    const channel = channels[room];
    const clientCount = IO.sockets.in(room).clients.length;
    console.log("Checking", room, clientCount);
    if (clientCount > 0 && channel && channel.nowPlaying == undefined) {
      startQueueItem(room, 0);
    }
  }
}

setInterval(startIfNonePlaying, 1000);
