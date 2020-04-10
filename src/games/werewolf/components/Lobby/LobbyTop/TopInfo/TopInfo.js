import React from 'react';

export default class TopInfo extends React.Component {
    constructor(props) {
        super(props);
    }

    render(){
        return (
            <div className="topInfo">
                <div className="topInfoText">
                    Name: {this.props.name || ""}
                </div>
            </div>
        )
    }
}