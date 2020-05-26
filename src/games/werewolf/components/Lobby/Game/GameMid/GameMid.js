import React from 'react';

export default class GameMid extends React.Component {
    constructor(props) {
        super(props);
    }

    exitGame(){
        this.props.exitGame();
    }

    render(){
        let JSX;
        if (this.props.isDead){
            JSX = (
                <div className="gameDead">You have been killed! But you can still spectate the game</div>
            );
        }
        let endGameJSX;
        if (this.props.showButton){
            endGameJSX = (
                <div className="gameExitGame">
                    <div className="gameExitGameButton" onClick={() => this.exitGame()}>Exit Game</div>
                </div>
            );
        }
        return (
            <div className="gameMid">
                <div className="gameJudge">
                    {this.props.text}
                    {JSX}
                </div>
                {endGameJSX}
            </div>
        )
    }
}