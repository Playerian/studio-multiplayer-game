import Avatar from '@material-ui/core/Avatar';
import GameComponent from '../../GameComponent.js';
import React from 'react';
import UserApi from '../../UserApi.js';
import firebase from 'firebase';
import { List, ListItem } from 'material-ui/List';
import "./Werewolf.css"

export default class Werewolf extends GameComponent {
  constructor(props) {
    super(props);
    this.state = {
      lobbies: {},
      userList: {},
      pulse: null,
      myself: {}
    };
    console.log(this);
    this.timer = undefined;
  }


  async isOnline(userSessionId){
    return await this.firebaseRef.child("virtualServer").child("userList").once("value", (data) => {
      let userList = data.val();
      for (let key in userList){
        let user = userList[key];
        if (user.getId() === userSessionId){
          return true;
        }
      }
      return false;
    });
  }

  onSessionDataChanged(data) {
    console.log("//data changed: ");
    console.log(data);
  }

  onSessionMetadataChanged(metadata) {
    console.log("//metadata changed:");
    console.log(metadata);
  }

  //unmount
  componentWillUnmount(){
    //remove timer & stuff
    clearTimeout(this.timer);
    //remove handlers
    let fb = this.firebaseRef;
    let virtualServer = fb.child("virtualServer");
    virtualServer.child("userList").off();
    virtualServer.child("pulse").off();
    console.log("unmounted");
  }

  //on mount
  componentDidMount() {
    console.log("LMG mounted and loaded");
    //connect to "virtual" server
    this.firebaseRef = this.getSessionDatabaseRef();
    let fb = this.firebaseRef;
    let virtualServer = fb.child("virtualServer");
    let component = this;
    console.log(fb);
    //send yourself to the virtual server
    let myself = new LocalUser(this.getMyUserId());
    //send yourself to userList
    let userList = virtualServer.child("userList");
    let newRef = userList.push();
    let key = newRef.key;
    myself.key = key;
    //set state
    component.setState({myself: myself});
    //set new ref
    newRef.set(myself, (e) => {
      if (e) throw e;
      //fetch data
      fb.once("value", (data) => {
        let objData = data.val();
        console.log(objData);
        let userListData = objData.virtualServer.userList;
        let pulse = objData.virtualServer.pulse;
        if (!pulse){
          //set first item of userlist as pulse
          userList.limitToFirst(1).once("value" ,(data) => {
            pulse = Object.keys(data.val())[0];
            console.log(pulse);
            component.setState({
              userList: userListData,
              pulse: pulse
            });
            virtualServer.child("pulse").set(pulse);
          });
        }else{
          //set state
          component.setState({
            userList: userListData,
            pulse: pulse
          });
        }
      });
    });
    //set handler on new user
    virtualServer.child("userList").on("value", (snapshot) => {
      console.log("user list changed: ");
      console.log(snapshot.val());
      //update state
      component.setState({userList: snapshot.val()});
      //kickstart pulse
      virtualServer.once("value", (data) => {
        let v = data.val();
        component.nextPulse(v.pulse, userList, virtualServer);
      })
    });
    //set handler on pulse
    virtualServer.child("pulse").on("value", (snapshot) => {
      console.log("pulse changed: ");
      console.log(snapshot.val());
      //remove existing timer
      clearTimeout(component.timer);
      component.timer = undefined;
      let pulse = snapshot.val();
      component.setState({
        pulse: pulse
      });
      //check if match self id
      if (component.state.myself.key === pulse){
        console.log("match id!");
        //move on to next
        component.nextPulse(pulse, userList, virtualServer);
      }else{
        //if not self id
        //try to remove after certain interval
        let timer = setTimeout(() => {
          //time up, petition for removal
          //add petition to user of pulse
          virtualServer.child("petition").child(pulse).update({
            //ur own key as key
            [component.state.myself.key]:true
          }, (e) => {
            if (e) throw e;
            //after finish, fetch # of petition
            virtualServer.once("value" ,(data) => {
              let dataVal = data.val();
              if (typeof dataVal.petition[pulse] !== 'object'){
                //already removed, clean up get home
                return;
              }
              let numOfPetition = Object.keys(dataVal.petition[pulse]).length;
              let userListLength = Object.keys(dataVal.userList).length;
              //if number is bigger than half, remove user
              if (numOfPetition >= Math.floor(userListLength / 2)){
                //remove from petition 
                virtualServer.child("petition").child(pulse).remove();
                //move pulse to next
                component.nextPulse(pulse, userList, virtualServer);
                //remove from userList
                virtualServer.child("userList").child(pulse).remove();
              }
            });
          });
        }, 5000);
        component.timer = timer;
      }
    });
  }

  async nextPulse(currentPulse, userList, virtualServer){
    let component = this;
    let next;
    if (currentPulse){
      //if currentPulse exist
      await virtualServer.child("userList").orderByKey().startAt(currentPulse).limitToFirst(2).once("value",async (data) => {
        console.log("grabbing next");
        let dataVal = data.val();
        if (dataVal){
          next = Object.keys(dataVal)[1];
        }else{
          //nothing in userList?
          //hacker gg
          console.log("nothing in userList?");
        }
        //if next
        if (next){
          component.setState({
            currentPulse: next
          });
          await virtualServer.child("pulse").set(next);
        }
        //if no next, set first item as pulse
        else{
          await userList.limitToFirst(1).once("value" ,async (data) => {
            currentPulse = Object.keys(data.val())[0];
            console.log(currentPulse);
            component.setState({
              pulse: currentPulse
            });
            await virtualServer.child("pulse").set(currentPulse);
          });
        }
      });
    }else{
      //if currentpulse doesnt exist
      //set first item as pulse
      await userList.limitToFirst(1).once("value" ,async (data) => {
        currentPulse = Object.keys(data.val())[0];
        console.log(currentPulse);
        component.setState({
          pulse: currentPulse
        });
        await virtualServer.child("pulse").set(currentPulse);
      });
    }
  }

  render() {
    var id = this.getSessionId();
    var currentUser = this.getMyUserId();
    var users = this.getSessionUserIds().map((user_id) => (
      <li key={user_id}>{user_id}</li>
    ));
    var creator = this.getSessionCreatorUserId();

    let userList = this.state.userList;
    let userListJSX = [];
    for (let key in userList){
      let user = userList[key];
      userListJSX.push(<li key={key}>{user.key}</li>);
    }

    return (
      <div>
        <p>Session ID: {id}</p>
        <p>Session creator: {creator}</p>
        <p>Your ID: {currentUser}</p>
        <p>Your Key: </p>
        <p>{(this.state.myself.key) || undefined}</p>
        <p>All User:</p>
        <ul> {users} </ul>
        <p>Current Pulse: </p>
        <p>{(this.state.pulse) || undefined}</p>
        <p>Connected User: </p>
        <ul> {userListJSX} </ul>
      </div>
    );

  }
}

//constructors
class LocalUser{
  constructor(userId){
    this.userId = userId;
    this.key = undefined;
    this.location = "undefined";
  }
  getKey(){
    return this.key;
  }
  getId(){
    return this.userId;
  }
}

//methods
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

window.fet = function(ref){
  return ref.once('value', (data)=>{
    console.log(data.val());
  });
}