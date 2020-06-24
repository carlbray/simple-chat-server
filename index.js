const net = require("net");
const uuid = require("uuid");
const args = require("minimist")(process.argv);
let port = +(args.port || args.p) || process.env.PORT || 45620, host = args.host || args.h || process.env.HOST || "0.0.0.0";

const users = [];

const validName = str => /^[a-zA-Z0-9-_!@$&(){}=|?+*]{3,16}$/.test(str),
    validMsg = str => str.length <= 1024 && str.length > 0;

function removeUser(id) {
    try {
        let idx = getIndex(id);
        if (idx > -1) {
            users.splice(idx, 1);
            return true;
        } else
            return false;
    } catch {
        return false;
    }
}

function getIndex(val, type = "ID") {
    let idx = users.findIndex(x => (type === "ID" ? x.id : x.name) === val);
    return idx > -1 ? idx : false;
}
function getName(id) {
    let user = users[getIndex(id)];
    if (user) return user.name;
    else return "[INVALID_USER]";
}
function getId(name) {
    let user = users[getIndex(name, "NAME")];
    if (user) return user.id;
    else return false;
}

function broadcast(msg) {
    console.log(msg);
    users.forEach(user => user.c.write(msg + "\n"));
}
function sendMsg(id, message) {
    message = message.toString().trim();
    if (validMsg(message)) {
        broadcast(`<${getName(id)}> ${message}`);
        return true;
    } else
        return false;
}

net.createServer(c => {
    const id = uuid.v4();
    let name = false;
    users.push({ id: id, c: c });
    c.on("end", () => {
        if (name)
            broadcast("[-] " + name);
        removeUser(id);
    });
    c.on("timeout", c.end);
    c.on("error", () => removeUser(id));
    c.write("Enter name: ")
    c.once("data", d => {
        d = d.toString().trim();
        if (validName(d) && !getId(d)) {
            name = d;
            users[getIndex(id)].name = name;
            broadcast("[+] " + name);
        } else {
            c.write("Name taken or invalid.");
            c.emit("end");
            return c.end();
        }
        c.write("Welcome, " + d + ".\nEntering a message sends it.\n");
        c.on("data", d => {
            d = d.toString().trim();
            if (!sendMsg(id, d))
                c.write("Message should be between 1-1024 characters.\n");
        });
    });
}).listen(port, host).once("listening", () => {
    console.log(`Listening on port ${+port + (host ? " and host '" + host + "'" : "")}.`);
});
