import React, { useState } from "react";
import YouTube from "react-youtube";
import "./App.css";
import Socket from "socket.io-client";
import { YTData } from "./types/YTData";
const client = Socket.connect("http://10.10.11.144:8000");

type QueueItem = {
  url: string;
  lengthMs: number;
  queuedAt: Date;
  ytData: YTData;
  startedPlaying?: Date;
};

type State = {
  queue: Array<QueueItem>;
  roomName: string;
  rooms: Array<string>;
  videoId?: string;
  text?: string;
  yt?: any;
};
export class App extends React.Component<any, State> {
  state = {
    queue: new Array<QueueItem>(),
    videoId: "",
    roomName: "test",
    rooms: new Array<string>()
  } as State;

  componentDidMount() {
    client.on("connect", () => {
      client.emit("join", this.state.roomName);
      client.on("play", (queueItem: QueueItem) => {
        console.log(queueItem.ytData.items[0].id);
        this.setVideoId(queueItem.ytData.items[0].id);
        if (this.state.yt) {
          this.state.yt.playVideo();
        }
      });

      client.on("new", (queueItem: QueueItem) => {
        console.log(this.state.queue);
        this.setQueue(this.state.queue.concat([queueItem]));
      });
    });
    this.fetchQueue();
    this.fetchRooms();
  }

  fetchQueue() {
    return window
      .fetch(`http://10.10.11.144:8000/channel/${this.state.roomName}`)
      .then(resp => resp.json())
      .then(channel => {
        this.setQueue(channel.q);
      });
  }

  fetchRooms() {
    return window
      .fetch(`http://10.10.11.144:8000/channel`)
      .then(resp => resp.json())
      .then(rooms => {
        this.setRooms(rooms);
      });
  }

  setVideoId(id: string) {
    return this.setState({ videoId: id });
  }

  setQueue(q: Array<QueueItem>) {
    return this.setState({ queue: q });
  }

  setYt(yt: any) {
    this.setState({ yt });
  }

  setText(text: string) {
    this.setState({ text });
  }

  setRoom(text: string) {
    this.setState({ roomName: text });
  }

  setRooms(rooms: string[]) {
    this.setState({ rooms });
  }

  submitToQueue() {
    const body = { url: this.state.text };
    console.log(body);
    window.fetch(`http://10.10.11.144:8000/channel/${this.state.roomName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  }

  joinRoom() {
    this.fetchQueue();
    client.emit("join", this.state.roomName);
  }

  skip() {
    client.emit("skip", this.state.roomName);
  }

  handleReady(yt: any) {
    console.log(yt);
    if (this.state.videoId) {
      console.log("Playing");
      yt.playVideo();
      this.setYt(yt);
    }
  }

  render() {
    const opts = {
      height: "390",
      width: "640",
      playerVars: {
        autoplay: 1 as 1
      }
    };
    const queueItems = this.state.queue.map(i => (
      <img src={i.ytData.items[0].snippet.thumbnails.default.url} />
    ));
    const rooms = this.state.rooms.map(room => (
      <span style={{ paddingRight: "5px" }}>{room}</span>
    ));
    return (
      <div>
        <div>
          <input
            value={this.state.roomName}
            onChange={e => this.setRoom(e.target.value)}
          />
          <button onClick={e => this.joinRoom()}>join room</button>
        </div>

        <div>
          <input onChange={e => this.setText(e.target.value)} />
          <button onClick={e => this.submitToQueue()}>add</button>
        </div>
        <div>
          <button onClick={e => this.skip()}>skip</button>
        </div>
        <YouTube
          videoId={this.state.videoId}
          opts={opts}
          onReady={e => this.handleReady(e.target)}
        />
        <div>{queueItems}</div>
        <div>{rooms}</div>
      </div>
    );
  }
}

export default App;
