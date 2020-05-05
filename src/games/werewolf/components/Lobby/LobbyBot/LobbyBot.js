import React from 'react';
import LobbyCreateRoomButton from "./LobbyCreateRoomButton/LobbyCreateRoomButton";
import LobbyCreateRoomOption from "./LobbyCreateRoomOption/LobbyCreateRoomOption";
import LobbyRoomList from "./LobbyRoomList/LobbyRoomList";
import LobbyRoom from "./LobbyRoom/LobbyRoom"

export default class LobbyBot extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            //showing, 1: roomList  2: Create Room option
            showing: 1,
        };
    }

    onCreateRoom(name, max){
        this.props.onCreateRoom(name, max);
    }

    onCreateRoomButton(e){
        this.setState({showing: (this.state.showing + 1) % 2});
    }

    render(){
        let bottomContent;
        if (this.state.showing === 1){
            bottomContent = <LobbyRoomList roomList={this.props.roomList} onRoomJoin={(room) => this.props.onRoomJoin(room)}/>;
        }else{
            bottomContent = <LobbyCreateRoomOption onCreateRoom={(name, max) => this.onCreateRoom(name, max)} />;
        }
        if (this.props.location === "room"){
            return (
                <div className="lobbyBot">
                    <LobbyRoom 
                    onRoomExit={(room) => this.props.onRoomExit(room)}
                    onStartGame={(room) => this.props.onStartGame(room)}
                    roomList={this.props.roomList}
                    myself={this.props.myself}/>
                </div>
            );
        }else{
            return (
                <div className="lobbyBot">
                    <LobbyCreateRoomButton onCreateRoomButton={(e) => this.onCreateRoomButton(e)} currentShowing={this.state.showing}/>
                    <div className="lobbyBotBot">
                        {bottomContent}
                    </div>
                </div>
            )
        }
    }
}