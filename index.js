const net = require("net");
const uuid = require("uuid");
const args = require("minimist")(process.argv);
let port = +(args.port || args.p) || process.env.PORT || 45620,
	host = args.host || args.h || process.env.HOST || "0.0.0.0";
const startTime = Date.now();

const users = [];

const validName = (str) => /^[a-zA-Z0-9-_!@$()| ]{3,20}$/.test(str),
	validMsg = (str) => str.length <= 1024 && str.length > 0;

async function removeUser(id) {
	try {
		let idx = getIndex(id);
		if (idx > -1) {
			users.splice(idx, 1);
			return true;
		} else return false;
	} catch {
		return false;
	}
}

async function getIndex(val, type = "ID") {
	let idx = users.findIndex((x) => (type === "ID" ? x.id : x.name) === val);
	return idx > -1 ? idx : false;
}
async function getName(id) {
	let user = users[await getIndex(id)];
	if (user) return user.name;
	else return "[INVALID_USER]";
}
async function getId(name) {
	let user = users[await getIndex(name, "NAME")];
	if (user) return user.id;
	else return false;
}
async function getClient(val, type) {
	let user = users[await getIndex(val, type)];
	if (user) return user.c;
	else return false;
}

async function broadcast(msg) {
	console.log(msg);
	users.forEach(async (user) => user.c.write(msg + "\n"));
}
async function sendMsg(id, message) {
	message = message.toString().trim();
	if (validMsg(message)) {
		let date = new Date();
		broadcast(`<${await getName(id)}> ${message}`);
		return true;
	} else return false;
}

async function command(id, cmd) {
	let c = await getClient(id);
	let name = await getName(id);
	cmd = cmd.substr(1);
	let args = cmd.split(" ");
	let command = args.shift();
	switch (command) {
		case "help":
			c.write(`Commands:
help            Displays this help page
msg, message    Sends a message to another person
time, uptime    Displays uptime
github          Displays the URL of the github repository
`);
			break;

		case "message":
		case "msg":
			let targetName = await getId(args.shift());
			let message = args.join(" ");
			if (!(targetName && message && validMsg(message))) {
				c.write("Usage: msg|message <user> <message>\n");
				break;
			}
			(await getClient(targetName)).write(
				`${name} whispers: ${message}\n`
			);
			break;

		case "time":
		case "uptime":
			let runningFor =
				Math.round(((Date.now() - startTime) / (60 * 1000)) * 100) /
				100;
			c.write(`Current uptime: ${runningFor} minutes.\n`);
			break;

		case "github":
			c.write(`https://github.com/uAliFurkanY/simple-chat-server\n`);
			break;

		default:
			return false;
	}
	return true;
}

net.createServer(async (c) => {
	const id = uuid.v4();
	let name = false;
	users.push({ id: id, c: c });
	c.on("end", () => {
		if (name) broadcast("[-] " + name);
		removeUser(id);
	});
	c.on("timeout", c.end);
	c.on("error", () => removeUser(id));
	c.write("Enter name: ");
	c.once("data", async (d) => {
		d = d.toString().trim();
		if (validName(d) && !(await getId(d))) {
			name = d;
			users[await getIndex(id)].name = name;
			broadcast("[+] " + name);
		} else {
			c.write("Name taken or invalid.");
			c.emit("end");
			return c.end();
		}
		c.write("Welcome, " + d + ".\nEnter /help for help.\n");
		c.on("data", async (d) => {
			d = d.toString().trim();
			if (d.startsWith("/") && (await command(id, d)))
				console.log(`{${name}} ` + d);
			else if (!(await sendMsg(id, d)))
				c.write("Message should be between 1-1024 characters.\n");
		});
	});
})
	.listen(port, host)
	.once("listening", () => {
		console.log(
			`Listening on port ${
				+port + (host ? " and host '" + host + "'" : "")
			}.`
		);
	});
