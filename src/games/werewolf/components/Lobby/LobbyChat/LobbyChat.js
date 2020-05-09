import React from 'react';

export default class LobbyChat extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            inputValue: "",
            currentTab: "lobbyChat"
        };
    }

    handleInputChange(event){
        this.setState({inputValue: event.target.value});
    }

    handleButtonClick(event){
        console.log(this.state.inputValue);
        this.props.sendMessage(this.state.inputValue, this.state.currentTab);
        this.setState({inputValue: ""});
    }

    handleTabClick(event, tabName){
        console.log(tabName);
        this.setState({
            currentTab: tabName
        })
    }

    render(){
        let chatList = this.props.chatList;
        //append tabs
        let tabsJSX = [];
        for (let key in chatList){
            let style = {};
            if (key !== this.state.currentTab){
                style["borderBottom"] = "solid 5px";
            }
            tabsJSX.push(
            <div className="lobbyChatTab" key={key + "ChatTab"} style={style} onClick={(e) => this.handleTabClick(e, key)}>
                {key.replace("Chat", "")}
            </div>);
        }
        //append useless filler
        for (let i = tabsJSX.length; i < 5; i ++){
            tabsJSX.push(
                <div className="lobbyChatTabFiller" key={`filler${i}`}></div>
            );
        }
        //append chats
        let currentTab = this.state.currentTab
        let currentChat = chatList[currentTab];
        let displayChat = [];
        for (let key in currentChat){
            let picture = currentChat[key].picture;
            let message = currentChat[key].message;
            let username = currentChat[key].username;
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
                <div className="lobbyChatTitle">Chat</div>
                <div className="lobbyChatTabs">
                    {tabsJSX}
                </div>
                <div className="lobbyChatMessages">
                    {displayChat}
                </div>
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