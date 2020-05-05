import Avatar from '@material-ui/core/Avatar';
import GameComponent from '../../GameComponent.js';
import React from 'react';
import UserApi from '../../UserApi.js';
import firebase from 'firebase';
import { List, ListItem } from 'material-ui/List';
import "./Werewolf.css"
//components
import Lobby from "./components/Lobby/Lobby.js";
import GameComp from "./components/Game/Game.js";

export default class Werewolf extends GameComponent {
  constructor(props) {
    super(props);
    this.state = {
      roomList: {},
      userList: {},
      pulse: null,
      myself: {},
      room: {}
    };
    //timer
    this.timer = undefined;
    //execute mounting
    this.onMounted();
  }

  //virtual server
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

  //onmount
  componentDidMount(){
    window.addEventListener("beforeunload", (e) => this.onUnload(e));
  }

  onUnload(e){
    this.onDisconnect(this.state.myself);
    e.preventDefault();
  }

  //unmount
  componentWillUnmount(){
    //remove timer & stuff
    window.removeEventListener("beforeunload");
    clearTimeout(this.timer);
    this.onDisconnect(this.state.myself);
  }

  //disconnect
  onDisconnect(user){
    console.log("unmounted");
    //remove handlers
    let fb = this.firebaseRef;
    let virtualServer = fb.child("virtualServer");
    //only remove if self disconnecting
    if (user.key === this.state.myself.key){
      virtualServer.child("userList").off();
      virtualServer.child("pulse").off();
      //remove from petition 
      virtualServer.child("petition").child(user.key).remove();
      //remove from userList
      virtualServer.child("userList").child(user.key).remove();
    }
    //calling exits on those who should
    if (user.roomID){
      this.onRoomExit(user, this.state.roomList[user.roomID]);
    }
    //check if last user
    if (Object.keys(this.state.userList).length <= 1){
      //reset database
      virtualServer.set({});
      fb.child("roomList").set({});
    }
  }

  //on mount
  onMounted() {
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
    myself.location = "lobby";
    //set state
    this.state.myself = myself;
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
    //fetch roomlist
    let roomListRef = fb.child("roomList");
    roomListRef.once("value", (data) => {
      if (data){
        //data exist, write into state
        this.state.roomList = data.val();
      }else{
        //data does not exist, create data
        roomListRef.set({}, (e) => {
          if (e) throw e;
        });
      }
    })
    //set handler on new room
    roomListRef.on("value", (snapshot) => {
      let data = snapshot.val();
      this.onRoomListChange(data);
    })
    //fetch lobby
    let lobbyRef = fb.child("lobby");
    lobbyRef.once("value", (data) => {
      if (data){
        //data exist, write into state
        this.state.lobby = data.val();
      }else{
        //data does not exist, create data
        lobbyRef.set({}, (e) => {
          if (e) throw e;
        });
      }
    })
    //set handler on lobby
    lobbyRef.on("value", (snapshot) => {
      let data = snapshot.val();
      this.setState({lobby: data});
    });
    //set handler on lobby chat
    let lobbyChatRef = fb.child("lobbyChat");
    lobbyChatRef.on("value", (snapshot) => {
      let data = snapshot.val();
      this.setState({lobbyChat: data});
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
                //move pulse to next
                component.nextPulse(pulse, userList, virtualServer);
                //get user from pulse
                let user = component.state.userList[pulse];
                //call disconnect
                component.onDisconnect(user);
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

  //update user
  updateUserFirebase(user, snapshot){
    //update userlist
    let data = snapshot.val();
    let fb = this.firebaseRef;
    let userListRef = fb.child("virtualServer").child("userList");
    userListRef.child(user.key).set(user);
    //if in room
    if (user.roomID){
      //get room & update firebase
      let room = data.roomList[user.roomID];
      //update creator
      if (room.creatorKey === user.key){
        fb.child("roomList").child(user.roomID).child("creator").set(user);
      }
      //userlist in room update
      let realUserList = room.userList;
      for (let i = 0; i < realUserList.length; i ++){
        if (realUserList[i].key === user.key){
          realUserList[i] = user;
          break;
        }
      }
      fb.child("roomList").child(user.roomID).child("userList").set(realUserList);
    }
  }

  //lobby
  onChatMessage(message){
    console.log(`Main received: ${message}`)
    if (message.length <= 0){
      return;
    }
    let fb = this.firebaseRef;
    let newRef = fb.child("lobbyChat").push();
    let currentUser = this.getMyUserId();
    let chat = new Chat(message, UserApi.getPhotoUrl(currentUser), UserApi.getName(currentUser));
    newRef.set(chat, (e) => {
      if (e) throw e;
    })
  }

  //create room
  createRoom(name, max){
    let me = this.state.myself;
    //make a room
    let room = new Room(me, name, max);
    this.onRoomJoin(room);
  }

  //onRoomList
  onRoomListChange(data){
    //update
    let roomList = data;
    let me = this.state.myself;
    //if data is null
    if (data === null){
      me.location = "lobby";
      delete me.roomID;
      this.setState({
        roomList: {},
        myself: me
      });
      return;
    }
    //if creator destroys room
    if (me.roomID){
      if (!roomList[me.roomID]){
        //exists
        me.location = "lobby";
        delete me.roomID;
        alert("Room has been deleted by the host.");
      }
    }
    //set state
    this.setState({
      roomList: roomList,
      myself: me,
    });
  }

  //buttons in room
  onRoomExit(user, room){
    let me = user;
    let fb = this.firebaseRef;
    if (room.creatorKey === me.key){
      //room creator exits, destroy room
      //firebase
      fb.child("roomList").child(room.id).set({});
    }else{
      //member exits
      //splice
      let index = 0;
      for (let i = 0; i < room.userList.length; i ++){
        let user = room.userList[i];
        if (user.key === me.key){
          index = i;
          break;
        }
      }
      room.userList.splice(index, 1);
      //firebase
      fb.child("roomList").child(room.id).set(room);
    }
    //update user
    me.location = "lobby";
    //me.roomID = undefined;
    delete me.roomID;
    this.setState({
      room: undefined
    });
    if (me.key === this.state.myself.key){
      this.setState({
        myself: me
      });
    }
    //final firebase update
    fb.once("value", (snapshot) => {
      this.updateUserFirebase(me, snapshot);
    });
  }

  onRoomJoin(room){
    let me = this.state.myself;
    let fb = this.firebaseRef;
    if (room.maxPlayer > room.userList.length){
      room.userList.push(me);
      //update myself
      me.location = "room";
      me.roomID = room.id;
      //set state
      this.setState({
        myself: me,
        room: room,
      });
      //set firebase in room
      let roomListRef = fb.child("roomList");
      roomListRef.child(room.id).set(room, (e) => {
        if (e) throw e;
        fb.once("value", (snapshot) => {
          //update user
          this.updateUserFirebase(me, snapshot);
        });
      });
    }else{
      //room full lmao
    }
  }

  onStartGame(room){

  }

  //rendering
  render() {
    //get some stuff
    var id = this.getSessionId();
    var currentUser = this.getMyUserId();
    let userProfilePicUrl = UserApi.getPhotoUrl(currentUser);
    let username = UserApi.getName(currentUser);
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
    let location = this.state.myself.location;
    if (location === "lobby" || location === "room"){
      //lobby
      return(
        <div className="werewolf">
          <Lobby 
            //lobby chat
            sendMessage={(m) => this.onChatMessage(m)} 
            lobbyChat={this.state.lobbyChat}
            //room
            roomList={this.state.roomList} 
            onCreateRoom={(name, max) => this.createRoom(name, max)}
            onRoomJoin={(room) => this.onRoomJoin(room)}
            onRoomExit={(room) => this.onRoomExit(this.state.myself, room)}
            onStartGame={(room) => this.onStartGame(room)}
            //user info
            userProfilePic={userProfilePicUrl} 
            username={username}
            location={location}
            myself={this.state.myself}
          />
        </div>
      )
    }else{
      //emptiness
      return (
        <div className="werewolf">Now Loading...</div>
      )
    }

    // old stuff
    // return (
      
    //   <div>
    //     <p>Session ID: {id}</p>
    //     <p>Session creator: {creator}</p>
    //     <p>Your ID: {currentUser}</p>
    //     <p>Your Key: </p>
    //     <p>{(this.state.myself.key) || undefined}</p>
    //     <p>All User:</p>
    //     <ul> {users} </ul>
    //     <p>Current Pulse: </p>
    //     <p>{(this.state.pulse) || undefined}</p>
    //     <p>Connected User: </p>
    //     <ul> {userListJSX} </ul>
    //   </div>
    // );

  }
}

//constructors
class LocalUser{
  constructor(userId){
    //unique to google account
    this.userId = userId;
    this.profilePic = UserApi.getPhotoUrl(userId);
    this.username = UserApi.getName(userId);
    //unique on connection
    this.key = undefined;
    //dynamic properties
    this.location = undefined;
    //this.roomID = undefined;
  }
  getKey(){
    return this.key;
  }
  getId(){
    return this.userId;
  }
}

class Room{
  constructor(creator, name, maxPlayer){
    this.creator = creator;
    this.creatorId = creator.userId;
    this.creatorKey = creator.key;
    this.userList = [];
    this.currentStep = "lobby";
    this.id = randomID();
    this.name = name;
    this.maxPlayer = maxPlayer;
    this.chat = [];
    this.inGame = false;
    //this.game = ?;
  }
}

class Game{
  constructor(userList){
    //assign roles
    this.role = [];
    let roleList = []
    //append roleList
    for (let i = 1; i <= userList.length; i ++){
      switch (i) {
        case 1: case 2: case 7:
          roleList.push("villager");
          break;
        case 3:
          roleList.push("investigator");
          break;
        case 4: case 5: case 8:
          roleList.push("werewolf");
          break;
        case 6:
          roleList.push("doctor");
          break;
        default:
          break;
      }
    }
    //append roles
    for(let i = 0; i < userList.length; i ++){
      let key = userList[i].key;
    }
  }
}

class Chat{
  constructor(message, picture, username){
    this.message = message;
    this.picture = picture;
    this.username = username;
  }
}

//methods
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function randomID(){
  return parseInt(String(Math.random()).substring(2));
}

window.fet = function(ref){
  return ref.once('value', (data)=>{
    console.log(data.val());
  });
}