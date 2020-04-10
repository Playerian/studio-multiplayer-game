import React from 'react';

export default class LobbyChat extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            inputValue: ""
        };
    }

    handleInputChange(event){
        this.setState({inputValue: event.target.value});
    }

    handleButtonClick(event){
        console.log(this.state.inputValue);
        this.props.sendMessage(this.state.inputValue);
        this.setState({inputValue: ""});
    }

    render(){
        let chatList = this.props.lobbyChat;
        let displayChat = [];
        for (let key in chatList){
            let picture = chatList[key].picture;
            let message = chatList[key].message;
            let username = chatList[key].username;
            displayChat.unshift(
                <div key={key} className="chatContent">
                    <img className="chatPicture" src={picture}></img>
                    <div className="chatMessageContainer">
                        <div className="chatUsername">{username}</div>
                        <div className="chatMessage">{message}</div>
                    </div>
                </div>
            );
        }
        return (
            <div className="lobbyChat">
                <div className="lobbyChatTitle">Lobby Chat</div>
                <div className="lobbyChatMessages">{displayChat}</div>
                <div className="lobbyChatForm">
                    <div className="lobbyChatInput">
                        <textarea className="inputBox" onChange={(e) => this.handleInputChange(e)} value={this.state.inputValue}></textarea>
                    </div>
                    <div className="lobbyChatSubmit">
                        <button className="sendButton" onClick={(e) => this.handleButtonClick(e)}>Send</button>
                    </div>
                </div>
            </div>
        )
    }
}