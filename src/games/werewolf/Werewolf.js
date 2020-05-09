import Avatar from '@material-ui/core/Avatar';
import GameComponent from '../../GameComponent.js';
import React from 'react';
import UserApi from '../../UserApi.js';
import firebase from 'firebase';
import { List, ListItem } from 'material-ui/List';
import "./Werewolf.css"
//components
import Lobby from "./components/Lobby/Lobby.js";
import GameComp from "./components/Lobby/Game/Game.js";

export default class Werewolf extends GameComponent {
  constructor(props) {
    super(props);
    this.state = {
      roomList: {},
      userList: {},
      pulse: null,
      myself: {},
      room: {},
      didGameStarted: false,
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
    this.beforeunloadFunction = (e) => this.onUnload(e)
    window.addEventListener("beforeunload", this.beforeunloadFunction);
    window.fbReferenceWithHope = this.firebaseRef;
  }

  onUnload(e){
    this.onDisconnect(this.state.myself);
    e.preventDefault();
  }

  //unmount
  componentWillUnmount(){
    //remove timer & stuff
    window.removeEventListener("beforeunload", this.beforeunloadFunction);
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
      //lobby
      fb.child("lobby").off();
      fb.child("lobbyChat").off();
      //room and game
      fb.child("roomList").off();
      if (user.roomID){
        if (this.state.didGameStarted){
          fb.child("roomList").child(user.roomID).child("game").off();
        }
      }
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
      //update state
      component.setState({userList: snapshot.val()});
      //kickstart pulse
      virtualServer.once("value", (data) => {
        let v = data.val();
        // if (v){
        //   component.nextPulse(v.pulse, userList, virtualServer);
        // }else{
        //   component.nextPulse(v, userList, virtualServer);
        // }
        component.nextPulse(v.pulse, userList, virtualServer);
      })
    });
    //set handler on pulse
    virtualServer.child("pulse").on("value", (snapshot) => {
      //remove existing timer
      clearTimeout(component.timer);
      component.timer = undefined;
      let pulse = snapshot.val();
      component.setState({
        pulse: pulse
      });
      //check if match self id
      if (component.state.myself.key === pulse){
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
      let index = 0;
      for (let i = 0; i < realUserList.length; i ++){
        if (realUserList[i].key === user.key){
          realUserList[i] = user;
          index = i;
          break;
        }
      }
      fb.child("roomList").child(user.roomID).child("userList").child(index).set(user);
      //userlist in game update
      if (room.inGame){
        let game = room.game;
        let aliveList = game.aliveList;
        let deadList = game.deadList;
        let done = false;
        //loop
        aliveList.forEach((v, i) => {
          if (v.key === user.key){
            done = true;
            fb.child("roomList").child(user.roomID).child("game").child("aliveList").child(i).set(user);
            return;
          }
        });
        if (!done){
          deadList.forEach((v, i) => {
            if (v.key === user.key){
              fb.child("roomList").child(user.roomID).child("game").child("deadList").child(i).set(user);
              return;
            }
          });
        }
      }
    }
  }

  //lobby
  onChatMessage(message, tabName){
    console.log(`Main received: ${message}`)
    if (message.length <= 0){
      return;
    }
    let fb = this.firebaseRef;
    let currentUser = this.getMyUserId();
    if (tabName === "lobbyChat"){
      let newRef = fb.child("lobbyChat").push();
      let chat = new Chat(message, UserApi.getPhotoUrl(currentUser), UserApi.getName(currentUser));
      newRef.set(chat, (e) => {
        if (e) throw e;
      });
    }else if (tabName === "roomChat" || tabName === "werewolfChat"){
      let me = this.state.myself;
      if (me.roomID){
        let room = this.state.roomList[me.roomID];
        let chat = new Chat(message, UserApi.getPhotoUrl(currentUser), UserApi.getName(currentUser));
        if (tabName === "werewolfChat"){
          if (!room.game.werewolfChat){
            room.game.werewolfChat = [];
          }
          room.game.werewolfChat.push(chat);
          fb.child("roomList").child(me.roomID).set(room);
        }else{
          if (!room.chat){
            room.chat = [];
          }
          room.chat.push(chat);
          //firebase
          fb.child("roomList").child(me.roomID).set(room);
        }
      }else{
        //you're F-ed
        throw "up right now";
      }
    }
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
    if (me.roomID){
      //if creator destroys room
      let room = roomList[me.roomID];
      if (!room){
        //exists
        me.location = "lobby";
        delete me.roomID;
        alert("Room has been deleted by the host.");
        return;
      }
      //if game started
      if (room.inGame){
        let game = room.game;
        return this.gameStarted(me, game);
      }
      this.setState({room: room});
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
    if (!room){
      console.log("not room");
      return;
    }
    if (room.creatorKey === me.key){
      //room creator exits, destroy room
      //firebase
      fb.child("roomList").child(room.id).remove();
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
      if (room.game){
        fb.child("roomList").child(room.id).remove();
        console.log("Game terminated due to player disconnect");
      }else{
        fb.child("roomList").child(room.id).set(room);
      }
    }
    //update user
    me.location = "lobby";
    delete me.game;
    //me.roomID = undefined;
    delete me.roomID;
    this.setState({
      room: undefined,
      didGameStarted: false
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
    //check room
    if (room){
      let me = this.state.myself;
      let fb = this.firebaseRef;
      //check if creator
      if (room.creatorKey === me.key){
        //start game
        let game = new Game(me, room.userList);
        room.inGame = true;
        room.game = game;
        //set firebase
        fb.child("roomList").child(me.roomID).set(room);
        console.log("gameStarting");
        //if host, engage
        if (me.key === game.creatorKey){
          this.runningTheGame(game);
        }
      }
    }
  }

  gameStarted(me, game){
    let fb = this.firebaseRef;
    if (this.state.didGameStarted){
      return;
    }
    console.log("game has started");
    //update self
    for (let i = 0; i < game.aliveList.length; i ++){
      if (me.key === game.aliveList[i].key){
        me = game.aliveList[i];
        break;
      }
    }
    this.setState({
      myself: me,
      didGameStarted: true
    });
    //update self to firebase
    fb.once("value", (snapshot) => {
      this.updateUserFirebase(me, snapshot);
    });
    //attach handler to game
    fb.child("roomList").child(me.roomID).child("game").on("value", (snapshot) => {
      this.onGameUpdate(snapshot.val());
    });
  }

  runningTheGame(game){
    let fb = this.firebaseRef;
    let me = this.state.myself;
    console.log("up and running");
    let timeoutMs = 0;
    //first night
    if (game.step === "identify"){
      game.judge = "Werewolfs, wake up and identify each other";
      timeoutMs = 5000;
      game.step = "investigate";
    }
    //cycle
    else if (game.step === "killing"){
      game.judge = "Werewolfs, wake up and choose a player to kill";
      timeoutMs = 15000;
      game.step = "investigate";
    }
    else if (game.step === "investigate"){
      game.judge = "Investigator, wake up and choose a person to investigate.";
      timeoutMs = 10000;
      game.step = "doctor";
    }else if (game.step === "doctor"){
      game.judge = "Doctor, wake up and apply medicine to another player";
      timeoutMs = 10000;
      game.step = "day";
    }else if (game.step === "day"){
      game.judge = "Time passed, now is the day.";
      timeoutMs = 10000;
      game.step = "announce";
    }else if (game.step === "announce"){

    }else if (game.step === "discussion"){

    }else if (game.step === "vote"){

    }else if (game.step === "hang"){
      
    }else if (game.step === "night"){
      game.judge = "Time passed, now is the night.";
      timeoutMs = 5000;
      game.step = "killing";
    }
    //timeout
    if (timeoutMs >= 0){
      let timerID = setTimeout(() => {
        this.runningTheGame(game);
      }, timeoutMs);
      this.setState({timerID: timerID});
    }
    //update
    fb.child("roomList").child(me.roomID).child("game").set(game);
  }

  onGameUpdate(game){
    let me = this.state.myself;
    if (!game){
      console.log("not a game");
      //exit right now
      this.onRoomExit(me, this.state.roomList[me.roomID])
      return;
    }
    console.log(game);
    //check if input is needed
    if (game.commandList[me.key]){
      
    }
    //final setState
    this.state.room.game = game;
    this.setState({
      room: this.state.room
    });
  }

  //rendering
  render() {
    //get some stuff server
    var id = this.getSessionId();
    var currentUser = this.getMyUserId();
    let userProfilePicUrl = UserApi.getPhotoUrl(currentUser);
    let username = UserApi.getName(currentUser);
    var users = this.getSessionUserIds().map((user_id) => (
      <li key={user_id}>{user_id}</li>
    ));
    var creator = this.getSessionCreatorUserId();
    //userlist
    let userList = this.state.userList;
    let userListJSX = [];
    for (let key in userList){
      let user = userList[key];
      userListJSX.push(<li key={key}>{user.key}</li>);
    }
    //chat list
    let chatList = {};
    chatList.lobbyChat = this.state.lobbyChat;
    let me = this.state.myself;
    if (me.roomID){
      let room = this.state.roomList[me.roomID];
      chatList.roomChat = room.chat;
      if (room.game){
        if (me.role === "werewolf"){
          chatList.werewolfChat = room.game.werewolfChat;
        }
      }
    }
    //location conditional render
    let location = this.state.myself.location;
    if (location === "lobby" || location === "room"){
      //lobby
      return(
        <div className="werewolf">
          <Lobby 
            //lobby chat
            sendMessage={(m, r) => this.onChatMessage(m, r)} 
            chatList={chatList}
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
            room={this.state.room}
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
    //this.role
    //this.place
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
    this.id = randomID();
    this.name = name;
    this.maxPlayer = maxPlayer;
    this.chat = [];
    this.inGame = false;
    //this.game = ?;
  }
}

class Game{
  constructor(creator, userList){
    //assign roles
    let roleList = []
    let playerNum = [];
    //append roleList
    for (let i = 1; i <= userList.length; i ++){
      playerNum.push(i - 1);
      //append role
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
    this.userList = [];
    //append roles
    for(let i = 0; i < userList.length; i ++){
      let user = userList[i];
      let index = randomInt(0, roleList.length - 1);
      let role = roleList[index];
      let num = playerNum[index];
      user.role = role;
      user.place = num;
      //userList
      this.userList[num] = user;
      //splice
      roleList.splice(index, 1);
      playerNum.splice(index, 1);
    }
    //basics
    this.gameChat = [];
    this.werewolfChat = [];
    this.aliveList = userList;
    this.deadList = [];
    this.commandList = {sample: new Command(0)};
    this.creatorKey = creator.key;
    this.judge = "";
    //dynamic
    this.day = 0;
    this.currentTime = "night";
    this.step = "identify";
    // first night: identify
    // night: werewolf, investigator, doctor,
    // day: announce, discussion, vote
  }
}

class Chat{
  constructor(message, picture, username){
    this.message = message;
    this.picture = picture;
    this.username = username;
  }
}

class Command{
  constructor(targetKey){
    this.open = true;
    this.key = targetKey;
    this.value = null;
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

window.fetAll = function(){
  return window.fbReferenceWithHope.once('value', (data)=>{
    console.log(data.val());
  });
}

window.cleanse = function(){
  window.fbReferenceWithHope.child("virtualServer").set({});
  window.fbReferenceWithHope.child("roomList").set({});
}