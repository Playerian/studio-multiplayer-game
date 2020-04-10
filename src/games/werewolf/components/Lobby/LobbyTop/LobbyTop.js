import React from 'react';
import TopInfo from "./TopInfo/TopInfo.js"

export default class LobbyTop extends React.Component {
    constructor(props) {
        super(props);
    }

    render(){
        return (
            <div className="lobbyTop">
                <div className="profilePicContainer">
                    <img className="profilePic" src={this.props.userProfilePic}></img>
                </div>
                <TopInfo name={this.props.username}/>
            </div>
        )
    }
}