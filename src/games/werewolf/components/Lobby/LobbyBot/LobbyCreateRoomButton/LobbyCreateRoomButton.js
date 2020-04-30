import React from 'react';

export default class LobbyCreateRoomButton extends React.Component {
    constructor(props) {
        super(props);
    }

    onCreateRoomButton(e){
        this.props.onCreateRoomButton(e);
    }

    render(){
        return (
            <div className="lobbyCreateRoom">
                <div className="lobbyCreateRoomButton" onClick={(e) => this.onCreateRoomButton(e)}>
                    Create New Room
                </div>
            </div>
        )
    }
}