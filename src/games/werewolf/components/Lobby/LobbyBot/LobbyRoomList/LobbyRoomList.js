import React from 'react';

export default class LobbyRoomList extends React.Component {
    constructor(props) {
        super(props);
    }

    onRoomJoinClick(e, room){
        this.props.onRoomJoin(room);
    }

    render(){
        let list = this.props.roomList;
        let roomJSX = [];
        for (let thekey in list){
            let room = list[thekey];
            roomJSX.push(
            <div className="roomListContent" key={room.id + "container"}>
                <div className="roomListName" key={room.id + "name"}>{room.name}</div>
                <div className="roomListPlayer" key={room.id + "number"}>{`Player: ${room.userList.length}/${room.maxPlayer}`}</div>
                <div className="roomListJoin" key={room.id + "join"} onClick={(e) => this.onRoomJoinClick(e, room)}>{room.userList.length === room.maxPlayer ? "Full" : "Join"}</div>
            </div>);
        }
        //if empty
        if (roomJSX.length === 0){
            roomJSX.push(
                <div className="roomListSadness" key="noroom">Currently no room! -.-</div>
            )
        }
        return (
            <div className="lobbyRoomList">
                {roomJSX}
            </div>
        )
    }
}