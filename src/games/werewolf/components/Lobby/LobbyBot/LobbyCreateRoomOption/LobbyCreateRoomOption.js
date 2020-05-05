import React from 'react';

export default class LobbyCreateRoomOption extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            roomName: "Regular Room",
            maxPlayer: 8,
        };
    }

    onCreateRoomButton(e){
        this.props.onCreateRoom(this.state.roomName, this.state.maxPlayer);
    }

    handleRoomNameChange(e){
        this.setState({roomName: e.target.value});
    }

    handlePlayerChange(e){
        this.setState({maxPlayer: parseInt(e.target.value) || 0});
    }

    render(){
        return (
            <div className="lobbyCreateRoomOption">
                <div className="createRoomRow">
                    <div className="optionName">Room Name: </div>
                    <textarea className="inputBox" onChange={(e) => this.handleRoomNameChange(e)} value={this.state.roomName}></textarea>
                </div>
                <div className="createRoomRow">
                    <div className="optionName">Max Player: </div>
                    <textarea className="inputBox" onChange={(e) => this.handlePlayerChange(e)} value={this.state.maxPlayer}></textarea>
                </div>
                <div className="createRoomRow createRoomButtonRow">
                    <div className="createRoomButton" onClick={(e) => this.onCreateRoomButton(e)}>Create ROom</div>
                </div>
            </div>
        )
    }
}