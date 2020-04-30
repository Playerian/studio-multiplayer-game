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

    onCreateRoom(e){
        this.props.onCreateRoom(e);
    }

    render(){
        return (
            <div className="lobby">
                <div className="lobbyLeft">
                    <LobbyTop userProfilePic={this.props.userProfilePic} username={this.props.username}/>
                    <LobbyBot onCreateRoom={(e) => this.onCreateRoom(e)}/>
                </div>
                <LobbyChat lobbyChat={this.props.lobbyChat} sendMessage={(m) => this.receiveChatMessage(m)}/>
            </div>
        )
    }
}