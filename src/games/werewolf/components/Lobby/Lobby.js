import React from 'react';
import "./Lobby.css"
//components
import LobbyTop from "./LobbyTop/LobbyTop.js"
import LobbyBot from "./LobbyBot/LobbyBot.js"
import LobbyChat from "./LobbyChat/LobbyChat.js"

export default class Lobby extends React.Component {
    constructor(props) {
        super(props);
    }

    receiveChatMessage(message){
        console.log("Lobby received: " + message);
        this.props.sendMessage(message);
    }

    onCreateRoom(name, max){
        this.props.onCreateRoom(name, max);
    }

    render(){
        return (
            <div className="lobby">
                <div className="lobbyLeft">
                    <LobbyTop 
                        userProfilePic={this.props.userProfilePic} 
                        username={this.props.username}
                    />
                    <LobbyBot 
                        location={this.props.location}
                        roomList={this.props.roomList}
                        myself={this.props.myself} 
                        onCreateRoom={(name, max) => this.onCreateRoom(name, max)}
                        onRoomJoin={(room) => this.props.onRoomJoin(room)}
                        onRoomExit={(room) => this.props.onRoomExit(room)}
                        onStartGame={(room) => this.props.onStartGame(room)}
                    />
                </div>
                <LobbyChat lobbyChat={this.props.lobbyChat} sendMessage={(m) => this.receiveChatMessage(m)}/>
            </div>
        )
    }
}