import React from 'react';

export default class GameMid extends React.Component {
    constructor(props) {
        super(props);
    }

    render(){
        let JSX;
        if (this.props.isDead){
            JSX = (
                <div className="gameDead">You have been killed! But you can still spectate the game</div>
            );
        }
        return (
            <div className="gameMid">
                <div className="gameJudge">
                    {this.props.text}
                </div>
                {JSX}
            </div>
        )
    }
}