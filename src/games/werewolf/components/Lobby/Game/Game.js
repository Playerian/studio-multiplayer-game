import React from 'react';
import "./Game.css"
import GameMid from "./GameMid/GameMid"
import CrossImg from"./cross.png"

export default class Game extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            guess: new Array(this.props.game.userList.length).fill("?"),
            currentIndex: undefined,
            showing: false,
            selecting: undefined,
            isDead: false,
        }
    }

    handleGuessClick(event, index){
        event.stopPropagation();
        let showing = this.state.showing;
        if (this.props.me.place === index){
            return;
        }
        if (showing === false){
            //show clicked stuff
            this.setState({
                showing: true,
                currentIndex: index
            });
        }else if (showing === true && this.state.currentIndex === index){
            //hide clicked stuff
            this.setState({showing: false});
        }else{
            //change stuff
            this.setState({currentIndex: index});
        }
    }

    handlePickClick(event, thing){
        let index = this.state.currentIndex;
        let guess = this.state.guess;
        guess[index] = thing;
        this.setState({
            showing: false,
            guess: guess
        });
    }

    handleUserClick(event, index){
        let me = this.props.me;
        let game = this.props.game;
        //check if in game
        if (game){
            //check if u are called
            if (game.commandList[me.key]){
                let command = game.commandList[me.key];
                if (command.type === "any"){
                    this.props.handleUserClick(index);
                    this.setState({selecting: index});
                }else if (command.type === "other"){
                    //check if index is self
                    if (game.userList[index].key !== me.key){
                        this.props.handleUserClick(index);
                        this.setState({selecting: index});
                    }
                }
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        let me = this.props.me;
        let game = this.props.game;
        //remove selecting when not selecting
        if (game){
            //check if u are not called
            if (!game.commandList[me.key]){
                //remove selecting
                if (Number.isInteger(this.state.selecting)){
                    this.setState({selecting: undefined});
                }
            }
        }
    }

    render(){
        let topJSX = [];
        let rightJSX = [];
        let botJSX = [];
        let leftJSX = [];
        //append
        let me = this.props.me;
        let game = this.props.game;
        let userList = game.userList;
        let extraPeopleTable = userList.length % 4 - 1;
        let peopleCount = Math.floor(userList.length / 4);
        let tableIndex = 0;
        let currentPeople = 0;
        for (let i = 0; i < userList.length; i ++){
            //need extra
            let extra = 0;
            if (extraPeopleTable >= tableIndex){
                extra = 1;
            }
            //check if exceeding
            if (currentPeople >= peopleCount + extra){
                tableIndex ++;
                currentPeople = 0;
            }
            let target;
            switch (tableIndex) {
                case 0:
                    target = topJSX;
                    break;
                case 1:
                    target = rightJSX;
                    break;
                case 2:
                    target = botJSX;
                    break;
                case 3:
                    target = leftJSX;
                    break;
                default:
                    break;
            }
            let user = userList[i];
            let isColumn = "";
            if (tableIndex % 2 === 1){
                isColumn = "gameUserContainerColumn";
            }
            let style = {};
            let role = this.state.guess[i];
            if (user.key === me.key){
                style.background = "rgb(0, 255, 106)";
                role = me.role;
            }
            //if werewolf
            if (me.role === "werewolf"){
                //see all other werewolf
                if (user.role === "werewolf"){
                    role = "werewolf";
                }
            }
            //if investigator
            if (me.role === "investigator"){
                if (game.investResult){
                    game.judge = game.investResult;
                }
            }
            //if selecting
            let containerStyle = {};
            if (i === this.state.selecting){
                containerStyle.border = "solid 5px yellow";
            }
            //if dead
            if (user.isDead){
                containerStyle["backgroundImage"] = `url(${CrossImg})`;
            }
            target.push(
                <div style={containerStyle} className={"gameUserContainer " + isColumn} key={"gameUserContainer" + i} onClick={(e) => this.handleUserClick(e, i)}>
                    <div style={style} className="gameUserPosition" key={"gameUserPosition" + i}>{i + 1}</div>
                    <div className="gameUserGuess" index={i} key={"gameUserGuess" + i} onClick={(e) => this.handleGuessClick(e, i)}>{role}</div>
                    <img className="gameUserPic" src={user.profilePic} key={"gameUserPic" + i}/>
                    <div className="gameUserName" key={"gameUserName" + i}>{user.username}</div>
                </div>
            );
            currentPeople ++;
        }
        //setting box
        let guessJSX;
        if (this.state.showing){
            guessJSX = (<div className="gameUserPicker">
                <div className="gamePick" onClick={(e) => this.handlePickClick(e, "√")}>√</div>
                <div className="gamePick" onClick={(e) => this.handlePickClick(e, "X")}>X</div>
                <div className="gamePick" onClick={(e) => this.handlePickClick(e, "?")}>?</div>
            </div>);
        }
        return (
            <div className="gameDiv">
                {guessJSX}
                <div className="gameColumn1">
                    {leftJSX}
                </div>
                <div className="gameColumn2">
                    <div className="gameTopContainer">
                        {topJSX}
                    </div>
                    <GameMid text={game.judge} isDead={this.props.isDead} showButton={game.end} exitGame={() => this.props.exitGame()}/>
                    <div className="gameBotContainer">
                        {botJSX}
                    </div>
                </div>
                <div className="gameColumn3">
                    {rightJSX}
                </div>
            </div>
        )
    }
}