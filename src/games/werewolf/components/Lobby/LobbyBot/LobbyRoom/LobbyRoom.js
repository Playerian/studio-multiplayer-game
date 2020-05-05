import React from 'react';

export default class LobbyRoom extends React.Component {
    constructor(props) {
        super(props);
    }

    onRoomExit(e){
        let room = this.props.roomList[this.props.myself.roomID];
        this.props.onRoomExit(room);
    }
    onStartGame(e){
        let room = this.props.roomList[this.props.myself.roomID];
        this.props.onStartGame(room);
    }

    render(){
        let room = this.props.roomList[this.props.myself.roomID];
        let playerList = room.userList;
        let myself = this.props.myself;
        //push player list
        let playerJSX = [];
        for (let i = 0; i < playerList.length; i ++){
            let player = playerList[i];
            playerJSX.push(
                <div className="lobbyRoomUser" key={player.key + "userinroom"}>
                    <img className="lobbyRoomUserIcon" key={player.key + "userinroomIcon"} src={player.profilePic}/>
                    <div className="lobbyRoomUserName" key={player.key + "userinroomName"}>
                        {player.username}
                    </div>
                </div>
            );
        }
        //push button
        let buttons = [];
        if (room.creatorKey === myself.key){
            buttons.push(<div className="lobbyRoomStart lobbyRoomButton" key="lobbyRoomStart" onClick={(e) => this.onStartGame(e)}>Start Game</div>);
            buttons.push(<div className="lobbyRoomBack lobbyRoomButton" key="lobbyRoomBack" onClick={(e) => this.onRoomExit(e)}>Remove Room</div>);
        }else{
            buttons.push(<div className="lobbyRoomBack lobbyRoomButton" key="lobbyRoomExit" onClick={(e) => this.onRoomExit(e)}>Exit Room</div>);
        }
        return (
            <div className="lobbyRoom">
                <div className="lobbyRoomName">{room.name}</div>
                <div className="lobbyRoomUserContainer">
                    {playerJSX}
                </div>
                <div className="lobbyRoomButtonContainer">
                    {buttons}
                </div>
            </div>
        )
    }
}