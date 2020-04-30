import React from 'react';
import LobbyCreateRoomButton from "./LobbyCreateRoomButton/LobbyCreateRoomButton";
import LobbyCreateRoomOption from "./LobbyCreateRoomOption/LobbyCreateRoomOption";
import LobbyRoomList from "./LobbyRoomList/LobbyRoomList";

export default class LobbyBot extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            //showing, 1: roomList  2: Create Room option
            showing: 1,
        };
    }

    onCreateRoom(e){
        this.props.onCreateRoom(e);
    }

    onCreateRoomButton(e){
        this.setState({showing: (this.state.showing + 1) % 2});
    }

    render(){
        let bottomContent;
        if (this.state.showing === 1){
            bottomContent = <LobbyRoomList/>;
        }else{
            bottomContent = <LobbyCreateRoomOption/>;
        }
        return (
            <div className="lobbyBot">
                <LobbyCreateRoomButton onCreateRoom={(e) => this.onCreateRoom(e)} onCreateRoomButton={(e) => this.onCreateRoomButton(e)} currentShowing={this.state.showing}/>
                <div className="lobbyBotBot">
                    {bottomContent}
                </div>
            </div>
        )
    }
}