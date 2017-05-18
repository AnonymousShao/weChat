/*
* http一般会和websocket配合使用
*
* socketio需要http创建链接
* */
let express = require('express');
let path = require('path');
let Message = require('./model').Message;
//app其实就是一个监听函数
let app =express();
app.use(express.static(__dirname));
app.get('/',function (req,res) {
    res.sendFile(path.resolve('index.html'));
});

let server = require('http').createServer(app);
let io = require('socket.io')(server);
let sockets = {

};

io.on('connection',function (socket) {
    let username;
    socket.on('message',function (msg) {
        //socket.send(msg);
        if(username){
            let reg = /@([^ ]+) (.+)/;
            let result = msg.match(reg);
            if(result){
                let toUsername = result[1];
                let content = result[2];
                socket.send({author:username,content:`<span style="color:red">${content}</span>`,createAt:new Date().toLocaleString()});
                sockets[toUsername].send({author:username,content:`<span style="color:red">${content}</span>`,createAt:new Date().toLocaleString()});
            }else{
                Message.create({author:username,content:msg},function (err,message) {
                    io.emit('message',message);//广播
                });

            }

        }else{
            username = msg;
            sockets[username] = socket;
            io.emit('message',{author:'系统',content:`欢迎<span class="user">${username}</span>加入聊天室`,createAt:new Date().toLocaleString()});
        }
    });
    socket.on('getAllMessages',function () {
        Message.find().sort({createAt:-1}).limit(20).exec(function (err,messages){
            messages.reverse();
            socket.emit('allMessages',messages);
            socket.send({author:'系统',content:'请输入昵称',createAt:new Date().toLocaleString()});
        });
    });
    socket.on('delete',function (_id) {
        Message.remove({_id},function () {
            socket.emit('deleted',_id);
        });
    });
    socket.on('revoke',function (_id) {
        Message.findById(_id,function (err,message) {
           if(Date.now() - message.createAt.getTime()<2*60*1000){
               Message.remove({_id},function () {
                   io.emit('revoked',_id);
               });
           }else{
               socket.send({
                   author:'系统',
                   content:'超过两分钟，无法撤回',
                   createAt:new Date().toLocaleString()
               });
           }
        });

    });
});

server.listen(8081);