import React from 'react';
import "./Lobby.css"
//components
import LobbyTop from "./LobbyTop/LobbyTop.js"
import LobbyBot from "./LobbyBot/LobbyBot.js"
import LobbyChat from "./LobbyChat/LobbyChat.js"
import Game from "./Game/Game"

export default class Lobby extends React.Component {
    constructor(props) {
        super(props);
    }

    receiveChatMessage(message, tabName){
        console.log("Lobby received: " + message);
        this.props.sendMessage(message, tabName);
    }

    onCreateRoom(name, max){
        this.props.onCreateRoom(name, max);
    }

    handleUserClick(index){
        let room = this.props.room;
        let me = this.props.myself;
        let game = room.game;
        this.props.updateCommand(game, game.commandList[me.key], index);
    }

    render(){
        let room = this.props.room;
        let me = this.props.myself;
        //check if in game
        if (room){
            let game = room.game;
            if (game){
                return (
                    <div className="lobby">
                        <div className="lobbyLeft">
                            <Game game={game} me={me} isDead={me.isDead} handleUserClick={(i) => this.handleUserClick(i)}/>
                        </div>
                        <LobbyChat chatList={this.props.chatList} sendMessage={(m, r) => this.receiveChatMessage(m, r)}/>
                    </div>
                )
            }
        }
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
                <LobbyChat chatList={this.props.chatList} sendMessage={(m, r) => this.receiveChatMessage(m, r)}/>
            </div>
        )
    }
}