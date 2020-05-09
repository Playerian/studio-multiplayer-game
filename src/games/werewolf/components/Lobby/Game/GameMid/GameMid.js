import React from 'react';

export default class GameMid extends React.Component {
    constructor(props) {
        super(props);
    }

    render(){
        let JSX;
        if (this.props.appear){
            JSX = (
                <div className="gameConfirm">confirm</div>
            )
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